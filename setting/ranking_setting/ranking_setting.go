package ranking_setting

import (
	"sync"

	"github.com/QuantumNous/new-api/setting/config"
)

// RankingSetting 用户排名设置
type RankingSetting struct {
	Groups           []string `json:"groups"`            // 仅显示这些分组的排名数据（空数组表示显示全部）
	ExcludeUsernames []string `json:"exclude_usernames"` // 排除这些用户名的排名数据
}

var (
	rankingSettingInstance *RankingSetting
	rankingSettingOnce     sync.Once
)

// GetRankingSettingInstance 获取排名设置单例
func GetRankingSettingInstance() *RankingSetting {
	rankingSettingOnce.Do(func() {
		rankingSettingInstance = &RankingSetting{
			Groups:           []string{},
			ExcludeUsernames: []string{},
		}
		config.GlobalConfig.Register("ranking_setting", rankingSettingInstance)
	})
	return rankingSettingInstance
}

// GetRankingGroups 获取排名过滤的分组列表
func GetRankingGroups() []string {
	instance := GetRankingSettingInstance()
	return instance.Groups
}

// GetRankingExcludeUsernames 获取排名排除的用户名列表
func GetRankingExcludeUsernames() []string {
	instance := GetRankingSettingInstance()
	return instance.ExcludeUsernames
}

// init 在包加载时自动注册配置
func init() {
	GetRankingSettingInstance()
}
