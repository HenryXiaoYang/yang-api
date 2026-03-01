package operation_setting

import "github.com/QuantumNous/new-api/setting/config"

// PoWSetting Proof of Work 配置
type PoWSetting struct {
	Enabled      bool   `json:"enabled"`       // 是否启用 PoW 校验
	Mode         string `json:"mode"`          // 运行模式: "replace", "supplement", "fallback"
	Difficulty   int    `json:"difficulty"`    // 前导零 bits 数，默认 18
	ChallengeTTL int    `json:"challenge_ttl"` // challenge 过期秒数，默认 300
}

// 默认配置
var powSetting = PoWSetting{
	Enabled:      false,     // 默认关闭
	Mode:         "replace", // 默认替代 Turnstile
	Difficulty:   18,        // 默认 18 位，约 0.5 秒
	ChallengeTTL: 10,        // 默认 10 秒过期
}

// PoW 运行模式常量
const (
	PoWModeReplace    = "replace"    // PoW 完全替代 Turnstile
	PoWModeSupplement = "supplement" // PoW + Turnstile 都需要
	PoWModeFallback   = "fallback"   // Turnstile 不可用时使用 PoW
)

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("pow_setting", &powSetting)
}

// GetPoWSetting 获取 PoW 配置
func GetPoWSetting() *PoWSetting {
	return &powSetting
}

// IsPoWEnabled 是否启用 PoW 校验
func IsPoWEnabled() bool {
	return powSetting.Enabled
}

// GetPoWMode 获取 PoW 运行模式
func GetPoWMode() string {
	if powSetting.Mode == "" {
		return PoWModeReplace
	}
	return powSetting.Mode
}

// GetPoWDifficulty 获取 PoW 难度
func GetPoWDifficulty() int {
	if powSetting.Difficulty <= 0 {
		return 18
	}
	return powSetting.Difficulty
}

// GetPoWChallengeTTL 获取 challenge 过期时间（秒）
func GetPoWChallengeTTL() int {
	if powSetting.ChallengeTTL <= 0 {
		return 10
	}
	return powSetting.ChallengeTTL
}
