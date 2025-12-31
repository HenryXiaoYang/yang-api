package ratio_setting

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/config"
)

// DynamicRatioMode 动态倍率模式
type DynamicRatioMode string

const (
	DynamicRatioModeNone DynamicRatioMode = "none"
	DynamicRatioModeTime DynamicRatioMode = "time"
	DynamicRatioModeRPM  DynamicRatioMode = "rpm"
)

// TimeRangeRatio 时间段倍率配置
type TimeRangeRatio struct {
	StartHour int     `json:"start_hour"` // 0-23
	EndHour   int     `json:"end_hour"`   // 0-23
	Ratio     float64 `json:"ratio"`
}

// RPMRangeRatio RPM区间倍率配置
type RPMRangeRatio struct {
	MinRPM int     `json:"min_rpm"` // 包含
	MaxRPM int     `json:"max_rpm"` // 不包含，-1表示无上限
	Ratio  float64 `json:"ratio"`
}

// GroupDynamicRatioConfig 单个分组的动态倍率配置
type GroupDynamicRatioConfig struct {
	TimeRanges []TimeRangeRatio `json:"time_ranges,omitempty"`
	RPMRanges  []RPMRangeRatio  `json:"rpm_ranges,omitempty"`
}

// DynamicGroupRatioSetting 动态分组倍率总配置
type DynamicGroupRatioSetting struct {
	Enabled          bool                               `json:"enabled"`
	Mode             DynamicRatioMode                   `json:"mode"`
	RPMWindowMinutes int                                `json:"rpm_window_minutes"`
	Timezone         string                             `json:"timezone"`
	GroupConfigs     map[string]GroupDynamicRatioConfig `json:"group_configs"`
}

var (
	dynamicGroupRatioSetting = DynamicGroupRatioSetting{
		Enabled:          false,
		Mode:             DynamicRatioModeNone,
		RPMWindowMinutes: 1,
		Timezone:         "Asia/Shanghai",
		GroupConfigs:     make(map[string]GroupDynamicRatioConfig),
	}
	dynamicGroupRatioMutex sync.RWMutex
)

func init() {
	config.GlobalConfig.Register("DynamicGroupRatioSetting", &dynamicGroupRatioSetting)
}

// GetDynamicGroupRatioSetting 获取动态分组倍率配置
func GetDynamicGroupRatioSetting() *DynamicGroupRatioSetting {
	dynamicGroupRatioMutex.RLock()
	defer dynamicGroupRatioMutex.RUnlock()
	return &dynamicGroupRatioSetting
}

// DynamicGroupRatioSetting2JSONString 序列化配置
func DynamicGroupRatioSetting2JSONString() string {
	dynamicGroupRatioMutex.RLock()
	defer dynamicGroupRatioMutex.RUnlock()

	jsonBytes, err := json.Marshal(dynamicGroupRatioSetting)
	if err != nil {
		common.SysLog("error marshalling dynamic group ratio setting: " + err.Error())
		return "{}"
	}
	return string(jsonBytes)
}

// UpdateDynamicGroupRatioSettingByJSONString 更新配置
func UpdateDynamicGroupRatioSettingByJSONString(jsonStr string) error {
	dynamicGroupRatioMutex.Lock()
	defer dynamicGroupRatioMutex.Unlock()

	var newSetting DynamicGroupRatioSetting
	if err := json.Unmarshal([]byte(jsonStr), &newSetting); err != nil {
		return err
	}
	if newSetting.GroupConfigs == nil {
		newSetting.GroupConfigs = make(map[string]GroupDynamicRatioConfig)
	}
	dynamicGroupRatioSetting = newSetting
	return nil
}

// CheckDynamicGroupRatioSetting 验证配置
func CheckDynamicGroupRatioSetting(jsonStr string) error {
	var setting DynamicGroupRatioSetting
	if err := json.Unmarshal([]byte(jsonStr), &setting); err != nil {
		return err
	}

	if setting.Mode != DynamicRatioModeNone && setting.Mode != DynamicRatioModeTime && setting.Mode != DynamicRatioModeRPM {
		return errors.New("invalid mode, must be none/time/rpm")
	}

	if setting.RPMWindowMinutes < 1 {
		return errors.New("rpm_window_minutes must be >= 1")
	}

	for groupName, cfg := range setting.GroupConfigs {
		if setting.Mode == DynamicRatioModeTime {
			for i, tr := range cfg.TimeRanges {
				if tr.StartHour < 0 || tr.StartHour > 23 || tr.EndHour < 0 || tr.EndHour > 24 {
					return fmt.Errorf("group %s time_ranges[%d]: hour must be 0-23 for start, 0-24 for end", groupName, i)
				}
				if tr.Ratio < 0 {
					return fmt.Errorf("group %s time_ranges[%d]: ratio must be >= 0", groupName, i)
				}
			}
		}
		if setting.Mode == DynamicRatioModeRPM {
			for i, rr := range cfg.RPMRanges {
				if rr.MinRPM < 0 {
					return fmt.Errorf("group %s rpm_ranges[%d]: min_rpm must be >= 0", groupName, i)
				}
				if rr.MaxRPM != -1 && rr.MaxRPM <= rr.MinRPM {
					return fmt.Errorf("group %s rpm_ranges[%d]: max_rpm must be > min_rpm or -1", groupName, i)
				}
				if rr.Ratio < 0 {
					return fmt.Errorf("group %s rpm_ranges[%d]: ratio must be >= 0", groupName, i)
				}
			}
		}
	}
	return nil
}

// GetDynamicGroupRatio 获取动态分组倍率
// 返回: (倍率, 是否使用动态倍率)
func GetDynamicGroupRatio(ctx context.Context, groupName string, userId int) (float64, bool) {
	dynamicGroupRatioMutex.RLock()
	setting := dynamicGroupRatioSetting
	dynamicGroupRatioMutex.RUnlock()

	if !setting.Enabled || setting.Mode == DynamicRatioModeNone {
		return 0, false
	}

	groupConfig, exists := setting.GroupConfigs[groupName]
	if !exists {
		return 0, false
	}

	switch setting.Mode {
	case DynamicRatioModeTime:
		return calculateTimeBasedRatio(groupConfig.TimeRanges, setting.Timezone)
	case DynamicRatioModeRPM:
		return calculateRPMBasedRatio(ctx, groupConfig.RPMRanges, userId, setting.RPMWindowMinutes)
	default:
		return 0, false
	}
}

// calculateTimeBasedRatio 计算基于时间的倍率
func calculateTimeBasedRatio(ranges []TimeRangeRatio, timezone string) (float64, bool) {
	if len(ranges) == 0 {
		return 0, false
	}

	// 获取指定时区的当前时间
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		loc, _ = time.LoadLocation("Asia/Shanghai") // 默认北京时区
	}
	currentHour := time.Now().In(loc).Hour()

	for _, r := range ranges {
		if isHourInRange(currentHour, r.StartHour, r.EndHour) {
			return r.Ratio, true
		}
	}
	return 0, false
}

// isHourInRange 检查小时是否在范围内
func isHourInRange(hour, start, end int) bool {
	if start <= end {
		return hour >= start && hour < end
	}
	// 跨午夜情况，如 22:00 - 06:00
	return hour >= start || hour < end
}

// calculateRPMBasedRatio 计算基于RPM的倍率
func calculateRPMBasedRatio(ctx context.Context, ranges []RPMRangeRatio, userId int, windowMinutes int) (float64, bool) {
	if len(ranges) == 0 {
		return 0, false
	}

	rpm := getUserCurrentRPM(ctx, userId, windowMinutes)
	for _, r := range ranges {
		if rpm >= r.MinRPM && (r.MaxRPM == -1 || rpm < r.MaxRPM) {
			return r.Ratio, true
		}
	}
	return 0, false
}

// getUserCurrentRPM 获取用户当前RPM
// 复用现有限流系统的 Redis key: rateLimit:MRRLS:{userId}
func getUserCurrentRPM(ctx context.Context, userId int, windowMinutes int) int {
	if !common.RedisEnabled || common.RDB == nil {
		return 0
	}

	key := fmt.Sprintf("rateLimit:MRRLS:%d", userId)
	windowDuration := time.Duration(windowMinutes) * time.Minute
	cutoffTime := time.Now().Add(-windowDuration)

	// 获取列表长度
	length, err := common.RDB.LLen(ctx, key).Result()
	if err != nil || length == 0 {
		return 0
	}

	// 获取所有时间戳并统计在窗口内的数量
	timestamps, err := common.RDB.LRange(ctx, key, 0, length-1).Result()
	if err != nil {
		return 0
	}

	count := 0
	for _, ts := range timestamps {
		t, err := time.Parse("2006-01-02 15:04:05", ts)
		if err != nil {
			continue
		}
		if t.After(cutoffTime) {
			count++
		}
	}
	return count
}
