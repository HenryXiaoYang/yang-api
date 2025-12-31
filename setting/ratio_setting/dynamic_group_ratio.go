package ratio_setting

import (
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
func GetDynamicGroupRatio(groupName string) (float64, bool) {
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
		return calculateRPMBasedRatio(groupConfig.RPMRanges)
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

// calculateRPMBasedRatio 计算基于系统总RPM的倍率
func calculateRPMBasedRatio(ranges []RPMRangeRatio) (float64, bool) {
	if len(ranges) == 0 {
		return 0, false
	}

	rpm := getSystemCurrentRPM()
	for _, r := range ranges {
		if rpm >= r.MinRPM && (r.MaxRPM == -1 || rpm < r.MaxRPM) {
			return r.Ratio, true
		}
	}
	return 0, false
}

// SystemRPMGetter 系统RPM获取函数类型
type SystemRPMGetter func() int

var systemRPMGetter SystemRPMGetter

// SetSystemRPMGetter 设置系统RPM获取函数（由model包调用以避免循环导入）
func SetSystemRPMGetter(getter SystemRPMGetter) {
	systemRPMGetter = getter
}

// getSystemCurrentRPM 获取系统当前RPM（最近60秒的请求数）
func getSystemCurrentRPM() int {
	if systemRPMGetter == nil {
		return 0
	}
	return systemRPMGetter()
}
