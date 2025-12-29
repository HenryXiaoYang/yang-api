package controller

import (
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

func GetAllLogs(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	logType, _ := strconv.Atoi(c.Query("type"))
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	username := c.Query("username")
	tokenName := c.Query("token_name")
	modelName := c.Query("model_name")
	channel, _ := strconv.Atoi(c.Query("channel"))
	group := c.Query("group")
	logs, total, err := model.GetAllLogs(logType, startTimestamp, endTimestamp, modelName, username, tokenName, pageInfo.GetStartIdx(), pageInfo.GetPageSize(), channel, group)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(logs)
	common.ApiSuccess(c, pageInfo)
	return
}

func GetUserLogs(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	userId := c.GetInt("id")
	logType, _ := strconv.Atoi(c.Query("type"))
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	tokenName := c.Query("token_name")
	modelName := c.Query("model_name")
	group := c.Query("group")
	logs, total, err := model.GetUserLogs(userId, logType, startTimestamp, endTimestamp, modelName, tokenName, pageInfo.GetStartIdx(), pageInfo.GetPageSize(), group)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(logs)
	common.ApiSuccess(c, pageInfo)
	return
}

func SearchAllLogs(c *gin.Context) {
	keyword := c.Query("keyword")
	logs, err := model.SearchAllLogs(keyword)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    logs,
	})
	return
}

func SearchUserLogs(c *gin.Context) {
	keyword := c.Query("keyword")
	userId := c.GetInt("id")
	logs, err := model.SearchUserLogs(userId, keyword)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    logs,
	})
	return
}

func GetLogByKey(c *gin.Context) {
	key := c.Query("key")
	logs, err := model.GetLogByKey(key)
	if err != nil {
		c.JSON(200, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"message": "",
		"data":    logs,
	})
}

func GetLogsStat(c *gin.Context) {
	logType, _ := strconv.Atoi(c.Query("type"))
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	tokenName := c.Query("token_name")
	username := c.Query("username")
	modelName := c.Query("model_name")
	channel, _ := strconv.Atoi(c.Query("channel"))
	group := c.Query("group")
	stat := model.SumUsedQuota(logType, startTimestamp, endTimestamp, modelName, username, tokenName, channel, group)
	//tokenNum := model.SumUsedToken(logType, startTimestamp, endTimestamp, modelName, username, "")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"quota": stat.Quota,
			"rpm":   stat.Rpm,
			"tpm":   stat.Tpm,
		},
	})
	return
}

func GetLogsSelfStat(c *gin.Context) {
	username := c.GetString("username")
	logType, _ := strconv.Atoi(c.Query("type"))
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	tokenName := c.Query("token_name")
	modelName := c.Query("model_name")
	channel, _ := strconv.Atoi(c.Query("channel"))
	group := c.Query("group")
	quotaNum := model.SumUsedQuota(logType, startTimestamp, endTimestamp, modelName, username, tokenName, channel, group)
	//tokenNum := model.SumUsedToken(logType, startTimestamp, endTimestamp, modelName, username, tokenName)
	c.JSON(200, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"quota": quotaNum.Quota,
			"rpm":   quotaNum.Rpm,
			"tpm":   quotaNum.Tpm,
			//"token": tokenNum,
		},
	})
	return
}

func DeleteHistoryLogs(c *gin.Context) {
	targetTimestamp, _ := strconv.ParseInt(c.Query("target_timestamp"), 10, 64)
	if targetTimestamp == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "target timestamp is required",
		})
		return
	}
	count, err := model.DeleteOldLog(c.Request.Context(), targetTimestamp, 100)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    count,
	})
	return
}

var (
	rankingCache     *model.RankingData
	rankingCacheTime int64
	rankingCacheDay  int
	rankingCacheMu   sync.RWMutex
)

func GetRankingStats(c *gin.Context) {
	isAdmin := c.GetInt("role") >= common.RoleAdminUser
	now := common.GetTimestamp()
	today := time.Now().Day()

	// 检查缓存是否有效（5分钟且同一天）
	rankingCacheMu.RLock()
	if rankingCache != nil && now-rankingCacheTime < 300 && rankingCacheDay == today {
		data := rankingCache
		rankingCacheMu.RUnlock()

		// 深拷贝用于脱敏
		userCallRanking := make([]model.UserCallRanking, len(data.UserCallRanking))
		copy(userCallRanking, data.UserCallRanking)
		ipRanking := make([]model.IPCallRanking, len(data.IPCallRanking))
		copy(ipRanking, data.IPCallRanking)
		userIPCountRanking := make([]model.UserIPCountRanking, len(data.UserIPCountRanking))
		copy(userIPCountRanking, data.UserIPCountRanking)
		userMinuteIPRanking := make([]model.UserMinuteIPRanking, len(data.UserMinuteIPRanking))
		copy(userMinuteIPRanking, data.UserMinuteIPRanking)
		if !isAdmin {
			for i := range userCallRanking {
				userCallRanking[i].Ip = maskIPs(userCallRanking[i].Ip)
			}
			for i := range ipRanking {
				ipRanking[i].Ip = maskIP(ipRanking[i].Ip)
			}
			for i := range userIPCountRanking {
				userIPCountRanking[i].Ip = maskIPs(userIPCountRanking[i].Ip)
			}
			for i := range userMinuteIPRanking {
				userMinuteIPRanking[i].Ip = maskIPs(userMinuteIPRanking[i].Ip)
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "",
			"data": gin.H{
				"user_call_ranking":      userCallRanking,
				"ip_call_ranking":        ipRanking,
				"user_token_ranking":     data.UserTokenRanking,
				"user_ip_count_ranking":  userIPCountRanking,
				"user_minute_ip_ranking": userMinuteIPRanking,
			},
		})
		return
	}
	rankingCacheMu.RUnlock()

	limit := 100
	var (
		userAggregateRanking []model.UserAggregateRanking
		ipCallRanking        []model.IPCallRanking
		userMinuteIPRanking  []model.UserMinuteIPRanking
		err1, err2, err3     error
		wg                   sync.WaitGroup
	)

	wg.Add(3)
	go func() {
		defer wg.Done()
		userAggregateRanking, err1 = model.GetTodayUserAggregateRanking()
	}()
	go func() {
		defer wg.Done()
		ipCallRanking, err2 = model.GetTodayIPCallRanking(limit)
	}()
	go func() {
		defer wg.Done()
		userMinuteIPRanking, err3 = model.GetTodayUserMinuteIPRanking(limit)
	}()
	wg.Wait()

	if err1 != nil {
		common.ApiError(c, err1)
		return
	}
	if err2 != nil {
		common.ApiError(c, err2)
		return
	}
	if err3 != nil {
		common.ApiError(c, err3)
		return
	}

	// 从合并查询结果生成3个排名
	userCallRanking := buildUserCallRanking(userAggregateRanking, limit)
	userTokenRanking := buildUserTokenRanking(userAggregateRanking, limit)
	userIPCountRanking := buildUserIPCountRanking(userAggregateRanking, limit)

	// 更新缓存
	rankingCacheMu.Lock()
	rankingCache = &model.RankingData{
		UserCallRanking:     userCallRanking,
		IPCallRanking:       ipCallRanking,
		UserTokenRanking:    userTokenRanking,
		UserIPCountRanking:  userIPCountRanking,
		UserMinuteIPRanking: userMinuteIPRanking,
	}
	rankingCacheTime = now
	rankingCacheDay = today
	rankingCacheMu.Unlock()

	// 非管理员时对IP进行脱敏
	responseUserCallRanking := make([]model.UserCallRanking, len(userCallRanking))
	copy(responseUserCallRanking, userCallRanking)
	responseIPRanking := make([]model.IPCallRanking, len(ipCallRanking))
	copy(responseIPRanking, ipCallRanking)
	responseUserIPCountRanking := make([]model.UserIPCountRanking, len(userIPCountRanking))
	copy(responseUserIPCountRanking, userIPCountRanking)
	responseUserMinuteIPRanking := make([]model.UserMinuteIPRanking, len(userMinuteIPRanking))
	copy(responseUserMinuteIPRanking, userMinuteIPRanking)
	if !isAdmin {
		for i := range responseUserCallRanking {
			responseUserCallRanking[i].Ip = maskIPs(responseUserCallRanking[i].Ip)
		}
		for i := range responseIPRanking {
			responseIPRanking[i].Ip = maskIP(responseIPRanking[i].Ip)
		}
		for i := range responseUserIPCountRanking {
			responseUserIPCountRanking[i].Ip = maskIPs(responseUserIPCountRanking[i].Ip)
		}
		for i := range responseUserMinuteIPRanking {
			responseUserMinuteIPRanking[i].Ip = maskIPs(responseUserMinuteIPRanking[i].Ip)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"user_call_ranking":      responseUserCallRanking,
			"ip_call_ranking":        responseIPRanking,
			"user_token_ranking":     userTokenRanking,
			"user_ip_count_ranking":  responseUserIPCountRanking,
			"user_minute_ip_ranking": responseUserMinuteIPRanking,
		},
	})
}

func maskIP(ip string) string {
	parts := strings.Split(ip, ".")
	if len(parts) == 4 {
		// IPv4: 192.168.1.100 -> 192.***.***100
		return parts[0] + ".***.***." + parts[3]
	}
	// IPv6 或其他格式：只显示前后部分
	if len(ip) > 8 {
		return ip[:4] + "****" + ip[len(ip)-4:]
	}
	return "****"
}

func maskIPs(ips string) string {
	parts := strings.Split(ips, ",")
	for i := range parts {
		parts[i] = maskIP(strings.TrimSpace(parts[i]))
	}
	return strings.Join(parts, ",")
}

// buildUserCallRanking 从聚合数据生成用户调用排名（按count排序）
func buildUserCallRanking(data []model.UserAggregateRanking, limit int) []model.UserCallRanking {
	sorted := make([]model.UserAggregateRanking, len(data))
	copy(sorted, data)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].Count > sorted[j].Count })
	if len(sorted) > limit {
		sorted = sorted[:limit]
	}
	result := make([]model.UserCallRanking, len(sorted))
	for i, r := range sorted {
		result[i] = model.UserCallRanking{
			Username: r.Username, DisplayName: r.DisplayName,
			Ip: r.Ip, IpCount: r.IpCount, Count: r.Count,
		}
	}
	return result
}

// buildUserTokenRanking 从聚合数据生成Token消耗排名（按tokens排序）
func buildUserTokenRanking(data []model.UserAggregateRanking, limit int) []model.UserTokenRanking {
	sorted := make([]model.UserAggregateRanking, len(data))
	copy(sorted, data)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].Tokens > sorted[j].Tokens })
	if len(sorted) > limit {
		sorted = sorted[:limit]
	}
	result := make([]model.UserTokenRanking, len(sorted))
	for i, r := range sorted {
		result[i] = model.UserTokenRanking{
			Username: r.Username, DisplayName: r.DisplayName,
			Tokens: r.Tokens, Count: r.Count, Quota: r.Quota,
		}
	}
	return result
}

// buildUserIPCountRanking 从聚合数据生成用户IP数排名（按ip_count排序）
// 注意：需要过滤空IP，与原 GetTodayUserIPCountRanking 行为一致
func buildUserIPCountRanking(data []model.UserAggregateRanking, limit int) []model.UserIPCountRanking {
	// 过滤并重新计算有效IP数
	filtered := make([]model.UserIPCountRanking, 0, len(data))
	for _, r := range data {
		// 过滤空IP
		ips := strings.Split(r.Ip, ",")
		validIPs := make([]string, 0, len(ips))
		for _, ip := range ips {
			ip = strings.TrimSpace(ip)
			if ip != "" {
				validIPs = append(validIPs, ip)
			}
		}
		if len(validIPs) == 0 {
			continue // 跳过没有有效IP的用户
		}
		filtered = append(filtered, model.UserIPCountRanking{
			Username: r.Username, DisplayName: r.DisplayName,
			Ip: strings.Join(validIPs, ","), IpCount: int64(len(validIPs)),
			Count: r.Count, Tokens: r.Tokens, Quota: r.Quota,
		})
	}
	sort.Slice(filtered, func(i, j int) bool { return filtered[i].IpCount > filtered[j].IpCount })
	if len(filtered) > limit {
		filtered = filtered[:limit]
	}
	return filtered
}
