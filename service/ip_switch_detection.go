package service

import (
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/bytedance/gopkg/util/gopool"
	"github.com/gin-gonic/gin"
)

const (
	IPRiskRapidSwitch = "IP_RAPID_SWITCH"
	IPRiskHopping     = "IP_HOPPING"

	userControlEnabledOptionKey = "user_control_enabled"

	defaultRapidSwitchThreshold = 3
	defaultRapidSwitchDuration  = 300
	defaultHoppingThreshold     = 3
	defaultHoppingDuration      = 30

	maxAnalyzeLogsPerUser = 200
	riskUserScanBatchSize = 200
)

type IPSwitchDetectionConfig struct {
	RapidSwitchThreshold int `json:"rapid_switch_threshold"`
	RapidSwitchDuration  int `json:"rapid_switch_duration"`
	HoppingThreshold     int `json:"hopping_threshold"`
	HoppingDuration      int `json:"hopping_duration"`
}

type UserIPSwitchMetrics struct {
	RapidSwitchCount int      `json:"rapid_switch_count"`
	AvgIPDuration    float64  `json:"avg_ip_duration"`
	RealSwitchCount  int      `json:"real_switch_count"`
	RiskTags         []string `json:"ip_risk_tags"`
}

type ipStaySegment struct {
	Ip        string
	FirstSeen int64
	LastSeen  int64
}

func GetIPSwitchDetectionConfig() IPSwitchDetectionConfig {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()

	return IPSwitchDetectionConfig{
		RapidSwitchThreshold: parsePositiveOptionInt("rapid_switch_threshold", defaultRapidSwitchThreshold),
		RapidSwitchDuration:  parsePositiveOptionInt("rapid_switch_duration", defaultRapidSwitchDuration),
		HoppingThreshold:     parsePositiveOptionInt("hopping_threshold", defaultHoppingThreshold),
		HoppingDuration:      parsePositiveOptionInt("hopping_duration", defaultHoppingDuration),
	}
}

func IsUserControlEnabled() bool {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()
	return strings.TrimSpace(common.OptionMap[userControlEnabledOptionKey]) == "true"
}

func TrackUserIPAccess(c *gin.Context, userId int) {
	if c == nil || userId <= 0 {
		return
	}
	ip := normalizeIPAddress(c.ClientIP(), 64)
	if ip == "" {
		return
	}
	now := int64(common.GetTimestamp())

	gopool.Go(func() {
		if err := model.CreateUserIPAccessLog(userId, ip, now); err != nil {
			common.SysLog(fmt.Sprintf("failed to record ip access log for user %d: %v", userId, err))
		}
	})
}

func BuildUserIPSwitchMetricsByUserIds(userIds []int, cfg IPSwitchDetectionConfig) (map[int]*UserIPSwitchMetrics, error) {
	result := make(map[int]*UserIPSwitchMetrics, len(userIds))
	if len(userIds) == 0 {
		return result, nil
	}

	logsMap, err := model.ListUserIPAccessLogsByUserIds(userIds, maxAnalyzeLogsPerUser)
	if err != nil {
		return nil, err
	}

	for _, userId := range userIds {
		logs := logsMap[userId]
		result[userId] = AnalyzeUserIPSwitchLogs(logs, cfg)
	}
	return result, nil
}

func AnalyzeUserIPSwitchLogs(logs []*model.UserIPAccessLog, cfg IPSwitchDetectionConfig) *UserIPSwitchMetrics {
	cfg = normalizeIPSwitchConfig(cfg)
	metrics := &UserIPSwitchMetrics{
		RapidSwitchCount: 0,
		AvgIPDuration:    0,
		RealSwitchCount:  0,
		RiskTags:         []string{},
	}
	if len(logs) == 0 {
		return metrics
	}

	segments := buildIPStaySegments(logs)
	if len(segments) == 0 {
		return metrics
	}

	metrics.RealSwitchCount = len(segments) - 1

	var totalDuration int64
	rapidSwitchCount := 0
	for idx, segment := range segments {
		duration := segment.LastSeen - segment.FirstSeen
		if duration < 0 {
			duration = 0
		}
		totalDuration += duration
		if idx < len(segments)-1 && duration < int64(cfg.RapidSwitchDuration) {
			rapidSwitchCount++
		}
	}
	metrics.RapidSwitchCount = rapidSwitchCount
	metrics.AvgIPDuration = float64(totalDuration) / float64(len(segments))

	if metrics.RapidSwitchCount >= cfg.RapidSwitchThreshold &&
		metrics.AvgIPDuration < float64(cfg.RapidSwitchDuration) {
		metrics.RiskTags = append(metrics.RiskTags, IPRiskRapidSwitch)
	}
	if metrics.AvgIPDuration < float64(cfg.HoppingDuration) &&
		metrics.RealSwitchCount >= cfg.HoppingThreshold {
		metrics.RiskTags = append(metrics.RiskTags, IPRiskHopping)
	}
	return metrics
}

func (m *UserIPSwitchMetrics) HasRiskTag(tag string) bool {
	if m == nil || tag == "" {
		return false
	}
	for _, riskTag := range m.RiskTags {
		if riskTag == tag {
			return true
		}
	}
	return false
}

func ListRiskUserIdsByIPSwitch(riskType string, cfg IPSwitchDetectionConfig) ([]int, error) {
	if !isSupportedIPRiskType(riskType) {
		return []int{}, nil
	}

	userIds, err := model.ListUserIdsWithIPAccessLogs()
	if err != nil {
		return nil, err
	}
	if len(userIds) == 0 {
		return []int{}, nil
	}

	riskUserIds := make([]int, 0, len(userIds)/5)
	for start := 0; start < len(userIds); start += riskUserScanBatchSize {
		end := start + riskUserScanBatchSize
		if end > len(userIds) {
			end = len(userIds)
		}
		batchUserIds := userIds[start:end]
		metricsMap, buildErr := BuildUserIPSwitchMetricsByUserIds(batchUserIds, cfg)
		if buildErr != nil {
			return nil, buildErr
		}
		for _, userId := range batchUserIds {
			if metricsMap[userId] != nil && metricsMap[userId].HasRiskTag(riskType) {
				riskUserIds = append(riskUserIds, userId)
			}
		}
	}
	sort.Ints(riskUserIds)
	return riskUserIds, nil
}

func isSupportedIPRiskType(riskType string) bool {
	return riskType == IPRiskRapidSwitch || riskType == IPRiskHopping
}

func buildIPStaySegments(logs []*model.UserIPAccessLog) []ipStaySegment {
	if len(logs) == 0 {
		return []ipStaySegment{}
	}

	segments := make([]ipStaySegment, 0, len(logs))
	firstLog := logs[0]
	currentSegment := ipStaySegment{
		Ip:        normalizeIPAddress(firstLog.Ip, 64),
		FirstSeen: firstLog.SeenAt,
		LastSeen:  firstLog.SeenAt,
	}
	for idx := 1; idx < len(logs); idx++ {
		log := logs[idx]
		normalizedIP := normalizeIPAddress(log.Ip, 64)
		if normalizedIP == currentSegment.Ip {
			if log.SeenAt > currentSegment.LastSeen {
				currentSegment.LastSeen = log.SeenAt
			}
			if log.SeenAt < currentSegment.FirstSeen {
				currentSegment.FirstSeen = log.SeenAt
			}
			continue
		}
		segments = append(segments, currentSegment)
		currentSegment = ipStaySegment{
			Ip:        normalizedIP,
			FirstSeen: log.SeenAt,
			LastSeen:  log.SeenAt,
		}
	}
	segments = append(segments, currentSegment)
	return segments
}

func normalizeIPSwitchConfig(cfg IPSwitchDetectionConfig) IPSwitchDetectionConfig {
	if cfg.RapidSwitchThreshold <= 0 {
		cfg.RapidSwitchThreshold = defaultRapidSwitchThreshold
	}
	if cfg.RapidSwitchDuration <= 0 {
		cfg.RapidSwitchDuration = defaultRapidSwitchDuration
	}
	if cfg.HoppingThreshold <= 0 {
		cfg.HoppingThreshold = defaultHoppingThreshold
	}
	if cfg.HoppingDuration <= 0 {
		cfg.HoppingDuration = defaultHoppingDuration
	}
	return cfg
}

func parsePositiveOptionInt(key string, defaultValue int) int {
	value, ok := common.OptionMap[key]
	if !ok {
		return defaultValue
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return defaultValue
	}
	intValue, err := strconv.Atoi(value)
	if err != nil || intValue <= 0 {
		return defaultValue
	}
	return intValue
}

func normalizeIPAddress(ip string, maxLength int) string {
	ip = strings.TrimSpace(ip)
	if ip == "" {
		return ""
	}
	if len(ip) > maxLength {
		return ip[:maxLength]
	}
	return ip
}
