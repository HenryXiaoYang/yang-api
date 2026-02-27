package model

import (
	"context"
	"errors"
	"fmt"
	"sync/atomic"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/QuantumNous/new-api/types"

	"github.com/gin-gonic/gin"

	"github.com/bytedance/gopkg/util/gopool"
	"gorm.io/gorm"
)

type Log struct {
	Id               int    `json:"id" gorm:"index:idx_created_at_id,priority:1;index:idx_user_id_id,priority:2"`
	UserId           int    `json:"user_id" gorm:"index;index:idx_user_id_id,priority:1;index:idx_logs_ranking,priority:3"`
	CreatedAt        int64  `json:"created_at" gorm:"bigint;index:idx_created_at_id,priority:2;index:idx_created_at_type;index:idx_logs_ranking,priority:1"`
	Type             int    `json:"type" gorm:"index:idx_created_at_type;index:idx_logs_ranking,priority:2"`
	Content          string `json:"content"`
	Username         string `json:"username" gorm:"index;index:index_username_model_name,priority:2;index:idx_logs_ranking,priority:4;default:''"`
	TokenName        string `json:"token_name" gorm:"index;default:''"`
	ModelName        string `json:"model_name" gorm:"index;index:index_username_model_name,priority:1;default:''"`
	Quota            int    `json:"quota" gorm:"default:0"`
	PromptTokens     int    `json:"prompt_tokens" gorm:"default:0"`
	CompletionTokens int    `json:"completion_tokens" gorm:"default:0"`
	UseTime          int    `json:"use_time" gorm:"default:0"`
	IsStream         bool   `json:"is_stream"`
	ChannelId        int    `json:"channel" gorm:"index"`
	ChannelName      string `json:"channel_name" gorm:"->"`
	TokenId          int    `json:"token_id" gorm:"default:0;index"`
	Group            string `json:"group" gorm:"index"`
	Ip               string `json:"ip" gorm:"index;index:idx_logs_ranking,priority:5;default:''"`
	RequestId        string `json:"request_id,omitempty" gorm:"type:varchar(64);index:idx_logs_request_id;default:''"`
	Other            string `json:"other"`
}

// don't use iota, avoid change log type value
const (
	LogTypeUnknown = 0
	LogTypeTopup   = 1
	LogTypeConsume = 2
	LogTypeManage  = 3
	LogTypeSystem  = 4
	LogTypeError   = 5
	LogTypeRefund  = 6
)

func formatUserLogs(logs []*Log, startIdx int) {
	for i := range logs {
		logs[i].ChannelName = ""
		var otherMap map[string]interface{}
		otherMap, _ = common.StrToMap(logs[i].Other)
		if otherMap != nil {
			// Remove admin-only debug fields.
			delete(otherMap, "admin_info")
			// delete(otherMap, "reject_reason")
			delete(otherMap, "stream_status")
		}
		logs[i].Other = common.MapToJsonStr(otherMap)
		logs[i].Id = startIdx + i + 1
	}
}

func GetLogByTokenId(tokenId int) (logs []*Log, err error) {
	err = LOG_DB.Model(&Log{}).Where("token_id = ?", tokenId).Order("id desc").Limit(common.MaxRecentItems).Find(&logs).Error
	formatUserLogs(logs, 0)
	return logs, err
}

func RecordLog(userId int, logType int, content string) {
	if logType == LogTypeConsume && !common.LogConsumeEnabled {
		return
	}
	username, _ := GetUsernameById(userId, false)
	log := &Log{
		UserId:    userId,
		Username:  username,
		CreatedAt: common.GetTimestamp(),
		Type:      logType,
		Content:   content,
	}
	err := LOG_DB.Create(log).Error
	if err != nil {
		common.SysLog("failed to record log: " + err.Error())
	}
}

// RecordLogWithAdminInfo 记录操作日志，并将管理员相关信息存入 Other.admin_info，
func RecordLogWithAdminInfo(userId int, logType int, content string, adminInfo map[string]interface{}) {
	if logType == LogTypeConsume && !common.LogConsumeEnabled {
		return
	}
	username, _ := GetUsernameById(userId, false)
	log := &Log{
		UserId:    userId,
		Username:  username,
		CreatedAt: common.GetTimestamp(),
		Type:      logType,
		Content:   content,
	}
	if len(adminInfo) > 0 {
		other := map[string]interface{}{
			"admin_info": adminInfo,
		}
		log.Other = common.MapToJsonStr(other)
	}
	if err := LOG_DB.Create(log).Error; err != nil {
		common.SysLog("failed to record log: " + err.Error())
	}
}

func RecordTopupLog(userId int, content string, callerIp string, paymentMethod string, callbackPaymentMethod string) {
	username, _ := GetUsernameById(userId, false)
	adminInfo := map[string]interface{}{
		"server_ip":               common.GetIp(),
		"node_name":               common.NodeName,
		"caller_ip":               callerIp,
		"payment_method":          paymentMethod,
		"callback_payment_method": callbackPaymentMethod,
		"version":                 common.Version,
	}
	other := map[string]interface{}{
		"admin_info": adminInfo,
	}
	log := &Log{
		UserId:    userId,
		Username:  username,
		CreatedAt: common.GetTimestamp(),
		Type:      LogTypeTopup,
		Content:   content,
		Ip:        callerIp,
		Other:     common.MapToJsonStr(other),
	}
	err := LOG_DB.Create(log).Error
	if err != nil {
		common.SysLog("failed to record topup log: " + err.Error())
	}
}

func RecordErrorLog(c *gin.Context, userId int, channelId int, modelName string, tokenName string, content string, tokenId int, useTimeSeconds int,
	isStream bool, group string, other map[string]interface{}) {
	logger.LogInfo(c, fmt.Sprintf("record error log: userId=%d, channelId=%d, modelName=%s, tokenName=%s, content=%s", userId, channelId, modelName, tokenName, content))
	username := c.GetString("username")
	requestId := c.GetString(common.RequestIdKey)
	otherStr := common.MapToJsonStr(other)
	log := &Log{
		UserId:           userId,
		Username:         username,
		CreatedAt:        common.GetTimestamp(),
		Type:             LogTypeError,
		Content:          content,
		PromptTokens:     0,
		CompletionTokens: 0,
		TokenName:        tokenName,
		ModelName:        modelName,
		Quota:            0,
		ChannelId:        channelId,
		TokenId:          tokenId,
		UseTime:          useTimeSeconds,
		IsStream:         isStream,
		Group:            group,
		Ip:               c.ClientIP(),
		RequestId:        requestId,
		Other:            otherStr,
	}
	err := LOG_DB.Create(log).Error
	if err != nil {
		logger.LogError(c, "failed to record log: "+err.Error())
	}
}

type RecordConsumeLogParams struct {
	ChannelId        int                    `json:"channel_id"`
	PromptTokens     int                    `json:"prompt_tokens"`
	CompletionTokens int                    `json:"completion_tokens"`
	ModelName        string                 `json:"model_name"`
	TokenName        string                 `json:"token_name"`
	Quota            int                    `json:"quota"`
	Content          string                 `json:"content"`
	TokenId          int                    `json:"token_id"`
	UseTimeSeconds   int                    `json:"use_time_seconds"`
	IsStream         bool                   `json:"is_stream"`
	Group            string                 `json:"group"`
	Other            map[string]interface{} `json:"other"`
}

func RecordConsumeLog(c *gin.Context, userId int, params RecordConsumeLogParams) {
	if !common.LogConsumeEnabled {
		return
	}
	logger.LogInfo(c, fmt.Sprintf("record consume log: userId=%d, params=%s", userId, common.GetJsonString(params)))
	username := c.GetString("username")
	requestId := c.GetString(common.RequestIdKey)
	otherStr := common.MapToJsonStr(params.Other)
	log := &Log{
		UserId:           userId,
		Username:         username,
		CreatedAt:        common.GetTimestamp(),
		Type:             LogTypeConsume,
		Content:          params.Content,
		PromptTokens:     params.PromptTokens,
		CompletionTokens: params.CompletionTokens,
		TokenName:        params.TokenName,
		ModelName:        params.ModelName,
		Quota:            params.Quota,
		ChannelId:        params.ChannelId,
		TokenId:          params.TokenId,
		UseTime:          params.UseTimeSeconds,
		IsStream:         params.IsStream,
		Group:            params.Group,
		Ip:               c.ClientIP(),
		RequestId:        requestId,
		Other:            otherStr,
	}
	err := LOG_DB.Create(log).Error
	if err != nil {
		logger.LogError(c, "failed to record log: "+err.Error())
	}
	if common.DataExportEnabled {
		gopool.Go(func() {
			LogQuotaData(userId, username, params.ModelName, params.Quota, common.GetTimestamp(), params.PromptTokens+params.CompletionTokens)
		})
	}
}

type RecordTaskBillingLogParams struct {
	UserId    int
	LogType   int
	Content   string
	ChannelId int
	ModelName string
	Quota     int
	TokenId   int
	Group     string
	Other     map[string]interface{}
}

func RecordTaskBillingLog(params RecordTaskBillingLogParams) {
	if params.LogType == LogTypeConsume && !common.LogConsumeEnabled {
		return
	}
	username, _ := GetUsernameById(params.UserId, false)
	tokenName := ""
	if params.TokenId > 0 {
		if token, err := GetTokenById(params.TokenId); err == nil {
			tokenName = token.Name
		}
	}
	log := &Log{
		UserId:    params.UserId,
		Username:  username,
		CreatedAt: common.GetTimestamp(),
		Type:      params.LogType,
		Content:   params.Content,
		TokenName: tokenName,
		ModelName: params.ModelName,
		Quota:     params.Quota,
		ChannelId: params.ChannelId,
		TokenId:   params.TokenId,
		Group:     params.Group,
		Other:     common.MapToJsonStr(params.Other),
	}
	err := LOG_DB.Create(log).Error
	if err != nil {
		common.SysLog("failed to record task billing log: " + err.Error())
	}
}

func GetAllLogs(logType int, startTimestamp int64, endTimestamp int64, modelName string, username string, tokenName string, startIdx int, num int, channel int, group string, requestId string) (logs []*Log, total int64, err error) {
	var tx *gorm.DB
	if logType == LogTypeUnknown {
		tx = LOG_DB
	} else {
		tx = LOG_DB.Where("logs.type = ?", logType)
	}

	if modelName != "" {
		tx = tx.Where("logs.model_name like ?", modelName)
	}
	if username != "" {
		tx = tx.Where("logs.username = ?", username)
	}
	if tokenName != "" {
		tx = tx.Where("logs.token_name = ?", tokenName)
	}
	if requestId != "" {
		tx = tx.Where("logs.request_id = ?", requestId)
	}
	if startTimestamp != 0 {
		tx = tx.Where("logs.created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("logs.created_at <= ?", endTimestamp)
	}
	if channel != 0 {
		tx = tx.Where("logs.channel_id = ?", channel)
	}
	if group != "" {
		tx = tx.Where("logs."+logGroupCol+" = ?", group)
	}
	err = tx.Model(&Log{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	err = tx.Order("logs.id desc").Limit(num).Offset(startIdx).Find(&logs).Error
	if err != nil {
		return nil, 0, err
	}

	channelIds := types.NewSet[int]()
	for _, log := range logs {
		if log.ChannelId != 0 {
			channelIds.Add(log.ChannelId)
		}
	}

	if channelIds.Len() > 0 {
		var channels []struct {
			Id   int    `gorm:"column:id"`
			Name string `gorm:"column:name"`
		}
		if common.MemoryCacheEnabled {
			// Cache get channel
			for _, channelId := range channelIds.Items() {
				if cacheChannel, err := CacheGetChannel(channelId); err == nil {
					channels = append(channels, struct {
						Id   int    `gorm:"column:id"`
						Name string `gorm:"column:name"`
					}{
						Id:   channelId,
						Name: cacheChannel.Name,
					})
				}
			}
		} else {
			// Bulk query channels from DB
			if err = DB.Table("channels").Select("id, name").Where("id IN ?", channelIds.Items()).Find(&channels).Error; err != nil {
				return logs, total, err
			}
		}
		channelMap := make(map[int]string, len(channels))
		for _, channel := range channels {
			channelMap[channel.Id] = channel.Name
		}
		for i := range logs {
			logs[i].ChannelName = channelMap[logs[i].ChannelId]
		}
	}

	return logs, total, err
}

const logSearchCountLimit = 10000

func GetUserLogs(userId int, logType int, startTimestamp int64, endTimestamp int64, modelName string, tokenName string, startIdx int, num int, group string, requestId string) (logs []*Log, total int64, err error) {
	var tx *gorm.DB
	if logType == LogTypeUnknown {
		tx = LOG_DB.Where("logs.user_id = ?", userId)
	} else {
		tx = LOG_DB.Where("logs.user_id = ? and logs.type = ?", userId, logType)
	}

	if modelName != "" {
		modelNamePattern, err := sanitizeLikePattern(modelName)
		if err != nil {
			return nil, 0, err
		}
		tx = tx.Where("logs.model_name LIKE ? ESCAPE '!'", modelNamePattern)
	}
	if tokenName != "" {
		tx = tx.Where("logs.token_name = ?", tokenName)
	}
	if requestId != "" {
		tx = tx.Where("logs.request_id = ?", requestId)
	}
	if startTimestamp != 0 {
		tx = tx.Where("logs.created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("logs.created_at <= ?", endTimestamp)
	}
	if group != "" {
		tx = tx.Where("logs."+logGroupCol+" = ?", group)
	}
	err = tx.Model(&Log{}).Limit(logSearchCountLimit).Count(&total).Error
	if err != nil {
		common.SysError("failed to count user logs: " + err.Error())
		return nil, 0, errors.New("查询日志失败")
	}
	err = tx.Order("logs.id desc").Limit(num).Offset(startIdx).Find(&logs).Error
	if err != nil {
		common.SysError("failed to search user logs: " + err.Error())
		return nil, 0, errors.New("查询日志失败")
	}

	formatUserLogs(logs, startIdx)
	return logs, total, err
}

type Stat struct {
	Quota int `json:"quota"`
	Rpm   int `json:"rpm"`
	Tpm   int `json:"tpm"`
}

func SumUsedQuota(logType int, startTimestamp int64, endTimestamp int64, modelName string, username string, tokenName string, channel int, group string) (stat Stat, err error) {
	tx := LOG_DB.Table("logs").Select("sum(quota) quota")

	// 为rpm和tpm创建单独的查询
	rpmTpmQuery := LOG_DB.Table("logs").Select("count(*) rpm, sum(prompt_tokens) + sum(completion_tokens) tpm")

	if username != "" {
		tx = tx.Where("username = ?", username)
		rpmTpmQuery = rpmTpmQuery.Where("username = ?", username)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
		rpmTpmQuery = rpmTpmQuery.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if modelName != "" {
		modelNamePattern, err := sanitizeLikePattern(modelName)
		if err != nil {
			return stat, err
		}
		tx = tx.Where("model_name LIKE ? ESCAPE '!'", modelNamePattern)
		rpmTpmQuery = rpmTpmQuery.Where("model_name LIKE ? ESCAPE '!'", modelNamePattern)
	}
	if channel != 0 {
		tx = tx.Where("channel_id = ?", channel)
		rpmTpmQuery = rpmTpmQuery.Where("channel_id = ?", channel)
	}
	if group != "" {
		tx = tx.Where(logGroupCol+" = ?", group)
		rpmTpmQuery = rpmTpmQuery.Where(logGroupCol+" = ?", group)
	}

	tx = tx.Where("type = ?", LogTypeConsume)
	rpmTpmQuery = rpmTpmQuery.Where("type = ?", LogTypeConsume)

	// 只统计最近60秒的rpm和tpm
	rpmTpmQuery = rpmTpmQuery.Where("created_at >= ?", time.Now().Add(-60*time.Second).Unix())

	// 执行查询
	if err := tx.Scan(&stat).Error; err != nil {
		common.SysError("failed to query log stat: " + err.Error())
		return stat, errors.New("查询统计数据失败")
	}
	if err := rpmTpmQuery.Scan(&stat).Error; err != nil {
		common.SysError("failed to query rpm/tpm stat: " + err.Error())
		return stat, errors.New("查询统计数据失败")
	}

	return stat, nil
}

// rpmCache 存储缓存的 RPM 值
type rpmCache struct {
	rpm       int
	updatedAt time.Time
}

// cachedRPM 使用 atomic.Value 存储 RPM 缓存，保证并发安全
var cachedRPM atomic.Value

// rpmCacheRefreshInterval 后台刷新间隔（建议 5-10 秒）
const rpmCacheRefreshInterval = 5 * time.Second

// InitRPMCache 初始化 RPM 缓存和后台刷新
func InitRPMCache() {
	// 立即执行一次查询，初始化缓存
	refreshRPMCache()

	// 启动后台刷新 goroutine
	go func() {
		ticker := time.NewTicker(rpmCacheRefreshInterval)
		defer ticker.Stop()
		for range ticker.C {
			refreshRPMCache()
		}
	}()

	common.SysLog("RPM cache initialized with refresh interval: " + rpmCacheRefreshInterval.String())
}

// refreshRPMCache 执行实际的数据库查询并更新缓存
func refreshRPMCache() {
	stat, err := SumUsedQuota(LogTypeConsume, 0, 0, "", "", "", 0, "")
	if err != nil {
		common.SysError("failed to refresh RPM cache: " + err.Error())
		return
	}
	cachedRPM.Store(&rpmCache{
		rpm:       stat.Rpm,
		updatedAt: time.Now(),
	})
}

// GetSystemRPM 获取系统当前RPM（从缓存读取，无数据库查询）
func GetSystemRPM() int {
	if c, ok := cachedRPM.Load().(*rpmCache); ok && c != nil {
		return c.rpm
	}
	// 缓存未初始化时的降级处理（仅启动时可能发生）
	return 0
}

// InitSystemRPMGetter 初始化系统RPM获取器
func InitSystemRPMGetter() {
	ratio_setting.SetSystemRPMGetter(GetSystemRPM)
}

func SumUsedToken(logType int, startTimestamp int64, endTimestamp int64, modelName string, username string, tokenName string) (token int) {
	tx := LOG_DB.Table("logs").Select("ifnull(sum(prompt_tokens),0) + ifnull(sum(completion_tokens),0)")
	if username != "" {
		tx = tx.Where("username = ?", username)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if modelName != "" {
		tx = tx.Where("model_name = ?", modelName)
	}
	tx.Where("type = ?", LogTypeConsume).Scan(&token)
	return token
}

func DeleteOldLog(ctx context.Context, targetTimestamp int64, limit int) (int64, error) {
	var total int64 = 0

	for {
		if nil != ctx.Err() {
			return total, ctx.Err()
		}

		result := LOG_DB.Where("created_at < ?", targetTimestamp).Limit(limit).Delete(&Log{})
		if nil != result.Error {
			return total, result.Error
		}

		total += result.RowsAffected

		if result.RowsAffected < int64(limit) {
			break
		}
	}

	return total, nil
}

type UserCallRanking struct {
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	Ip          string `json:"ip"`
	IpCount     int64  `json:"ip_count"`
	Count       int64  `json:"count"`
}

type IPCallRanking struct {
	Ip          string `json:"ip"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	UserCount   int64  `json:"user_count"`
	Count       int64  `json:"count"`
}

type UserTokenRanking struct {
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	Tokens      int64  `json:"tokens"`
	Count       int64  `json:"count"`
	Quota       int64  `json:"quota"`
}

type UserIPCountRanking struct {
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	Ip          string `json:"ip"`
	IpCount     int64  `json:"ip_count"`
	Count       int64  `json:"count"`
	Tokens      int64  `json:"tokens"`
	Quota       int64  `json:"quota"`
}

type UserMinuteIPRanking struct {
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	MaxIpCount  int64  `json:"max_ip_count"`
	MinuteTime  int64  `json:"minute_time"`
	Ip          string `json:"ip"`
}

// UserAggregateRanking 合并用户维度的聚合数据，用于生成多个排名
type UserAggregateRanking struct {
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	Ip          string `json:"ip"`
	IpCount     int64  `json:"ip_count"`
	Count       int64  `json:"count"`
	Tokens      int64  `json:"tokens"`
	Quota       int64  `json:"quota"`
}

type RankingData struct {
	UserCallRanking     []UserCallRanking
	IPCallRanking       []IPCallRanking
	UserTokenRanking    []UserTokenRanking
	UserIPCountRanking  []UserIPCountRanking
	UserMinuteIPRanking []UserMinuteIPRanking
}

func GetTodayUserCallRanking(limit int) ([]UserCallRanking, error) {
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).Unix()
	var rankings []UserCallRanking

	var selectSQL string
	if common.UsingPostgreSQL {
		selectSQL = "logs.username, COALESCE(users.display_name, '') as display_name, string_agg(DISTINCT logs.ip, ',') as ip, COUNT(DISTINCT logs.ip) as ip_count, count(*) as count"
	} else {
		selectSQL = "logs.username, COALESCE(users.display_name, '') as display_name, GROUP_CONCAT(DISTINCT logs.ip) as ip, COUNT(DISTINCT logs.ip) as ip_count, count(*) as count"
	}

	err := LOG_DB.Table("logs").
		Select(selectSQL).
		Joins("LEFT JOIN users ON logs.username = users.username").
		Where("logs.created_at >= ? AND logs.type = ? AND logs.user_id != 1", todayStart, LogTypeConsume).
		Group("logs.username, users.display_name").
		Order("count desc").
		Limit(limit).
		Scan(&rankings).Error
	return rankings, err
}

// GetTodayUserAggregateRanking 合并查询：一次获取用户维度的所有聚合数据
func GetTodayUserAggregateRanking() ([]UserAggregateRanking, error) {
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).Unix()
	var rankings []UserAggregateRanking

	var selectSQL string
	if common.UsingPostgreSQL {
		selectSQL = "logs.username, COALESCE(users.display_name, '') as display_name, string_agg(DISTINCT logs.ip, ',') as ip, COUNT(DISTINCT logs.ip) as ip_count, count(*) as count, sum(logs.prompt_tokens + logs.completion_tokens) as tokens, sum(logs.quota) as quota"
	} else {
		selectSQL = "logs.username, COALESCE(users.display_name, '') as display_name, GROUP_CONCAT(DISTINCT logs.ip) as ip, COUNT(DISTINCT logs.ip) as ip_count, count(*) as count, sum(logs.prompt_tokens + logs.completion_tokens) as tokens, sum(logs.quota) as quota"
	}

	err := LOG_DB.Table("logs").
		Select(selectSQL).
		Joins("LEFT JOIN users ON logs.username = users.username").
		Where("logs.created_at >= ? AND logs.type = ? AND logs.user_id != 1", todayStart, LogTypeConsume).
		Group("logs.username, users.display_name").
		Scan(&rankings).Error
	return rankings, err
}

func GetTodayIPCallRanking(limit int) ([]IPCallRanking, error) {
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).Unix()
	var rankings []IPCallRanking

	var selectSQL string
	if common.UsingPostgreSQL {
		selectSQL = "logs.ip, string_agg(DISTINCT logs.username, ',') as username, string_agg(DISTINCT COALESCE(users.display_name, ''), ',') as display_name, COUNT(DISTINCT logs.username) as user_count, count(*) as count"
	} else {
		selectSQL = "logs.ip, GROUP_CONCAT(DISTINCT logs.username) as username, GROUP_CONCAT(DISTINCT COALESCE(users.display_name, '')) as display_name, COUNT(DISTINCT logs.username) as user_count, count(*) as count"
	}

	err := LOG_DB.Table("logs").
		Select(selectSQL).
		Joins("LEFT JOIN users ON logs.username = users.username").
		Where("logs.created_at >= ? AND logs.type = ? AND logs.ip != '' AND logs.user_id != 1", todayStart, LogTypeConsume).
		Group("logs.ip").
		Order("count desc").
		Limit(limit).
		Scan(&rankings).Error
	return rankings, err
}

func GetTodayUserTokenRanking(limit int) ([]UserTokenRanking, error) {
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).Unix()
	var rankings []UserTokenRanking
	err := LOG_DB.Table("logs").
		Select("logs.username, COALESCE(users.display_name, '') as display_name, sum(logs.prompt_tokens + logs.completion_tokens) as tokens, count(*) as count, sum(logs.quota) as quota").
		Joins("LEFT JOIN users ON logs.username = users.username").
		Where("logs.created_at >= ? AND logs.type = ? AND logs.user_id != 1", todayStart, LogTypeConsume).
		Group("logs.username, users.display_name").
		Order("tokens desc").
		Limit(limit).
		Scan(&rankings).Error
	return rankings, err
}

func GetTodayUserIPCountRanking(limit int) ([]UserIPCountRanking, error) {
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).Unix()
	var rankings []UserIPCountRanking

	var selectSQL string
	if common.UsingPostgreSQL {
		selectSQL = "logs.username, COALESCE(users.display_name, '') as display_name, string_agg(DISTINCT logs.ip, ',') as ip, COUNT(DISTINCT logs.ip) as ip_count, count(*) as count, sum(logs.prompt_tokens + logs.completion_tokens) as tokens, sum(logs.quota) as quota"
	} else {
		selectSQL = "logs.username, COALESCE(users.display_name, '') as display_name, GROUP_CONCAT(DISTINCT logs.ip) as ip, COUNT(DISTINCT logs.ip) as ip_count, count(*) as count, sum(logs.prompt_tokens + logs.completion_tokens) as tokens, sum(logs.quota) as quota"
	}

	err := LOG_DB.Table("logs").
		Select(selectSQL).
		Joins("LEFT JOIN users ON logs.username = users.username").
		Where("logs.created_at >= ? AND logs.type = ? AND logs.ip != '' AND logs.user_id != 1", todayStart, LogTypeConsume).
		Group("logs.username, users.display_name").
		Order("ip_count desc").
		Limit(limit).
		Scan(&rankings).Error
	return rankings, err
}

func GetTodayUserMinuteIPRanking(limit int) ([]UserMinuteIPRanking, error) {
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).Unix()

	var aggFunc, divOp string
	if common.UsingPostgreSQL {
		aggFunc = "string_agg(DISTINCT logs.ip, ',')"
		divOp = "CAST(logs.created_at / 60 AS BIGINT)"
	} else {
		aggFunc = "GROUP_CONCAT(DISTINCT logs.ip)"
		divOp = "(logs.created_at / 60)"
	}

	sql := `SELECT username, display_name, ip_count as max_ip_count, minute_time, ips as ip FROM (
		SELECT logs.username, COALESCE(users.display_name, '') as display_name,
			` + divOp + ` as minute_time,
			COUNT(DISTINCT logs.ip) as ip_count,
			` + aggFunc + ` as ips,
			ROW_NUMBER() OVER (PARTITION BY logs.username ORDER BY COUNT(DISTINCT logs.ip) DESC, ` + divOp + ` DESC) as rn
		FROM logs
		LEFT JOIN users ON logs.username = users.username
		WHERE logs.created_at >= ? AND logs.type = ? AND logs.ip != '' AND logs.user_id != 1
		GROUP BY logs.username, users.display_name, ` + divOp + `
	) sub WHERE rn = 1 ORDER BY max_ip_count DESC LIMIT ?`

	var rankings []UserMinuteIPRanking
	err := LOG_DB.Raw(sql, todayStart, LogTypeConsume, limit).Scan(&rankings).Error
	return rankings, err
}
