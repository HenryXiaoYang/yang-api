package controller

import (
	"net/http"
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
		if !isAdmin {
			for i := range userCallRanking {
				userCallRanking[i].Ip = maskIPs(userCallRanking[i].Ip)
			}
			for i := range ipRanking {
				ipRanking[i].Ip = maskIP(ipRanking[i].Ip)
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "",
			"data": gin.H{
				"user_call_ranking":  userCallRanking,
				"ip_call_ranking":    ipRanking,
				"user_token_ranking": data.UserTokenRanking,
			},
		})
		return
	}
	rankingCacheMu.RUnlock()

	limit := 100
	userCallRanking, err := model.GetTodayUserCallRanking(limit)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	ipCallRanking, err := model.GetTodayIPCallRanking(limit)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	userTokenRanking, err := model.GetTodayUserTokenRanking(limit)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	// 更新缓存
	rankingCacheMu.Lock()
	rankingCache = &model.RankingData{
		UserCallRanking:  userCallRanking,
		IPCallRanking:    ipCallRanking,
		UserTokenRanking: userTokenRanking,
	}
	rankingCacheTime = now
	rankingCacheDay = today
	rankingCacheMu.Unlock()

	// 非管理员时对IP进行脱敏
	responseUserCallRanking := make([]model.UserCallRanking, len(userCallRanking))
	copy(responseUserCallRanking, userCallRanking)
	responseIPRanking := make([]model.IPCallRanking, len(ipCallRanking))
	copy(responseIPRanking, ipCallRanking)
	if !isAdmin {
		for i := range responseUserCallRanking {
			responseUserCallRanking[i].Ip = maskIPs(responseUserCallRanking[i].Ip)
		}
		for i := range responseIPRanking {
			responseIPRanking[i].Ip = maskIP(responseIPRanking[i].Ip)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"user_call_ranking":  responseUserCallRanking,
			"ip_call_ranking":    responseIPRanking,
			"user_token_ranking": userTokenRanking,
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
