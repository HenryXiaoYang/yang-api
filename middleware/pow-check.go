package middleware

import (
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

// PoWCheck PoW 校验中间件
func PoWCheck() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 检查 PoW 是否启用
		if !operation_setting.IsPoWEnabled() {
			c.Next()
			return
		}

		mode := operation_setting.GetPoWMode()
		turnstileEnabled := common.TurnstileCheckEnabled

		// 根据模式决定是否需要验证 PoW
		requirePoW := false
		switch mode {
		case operation_setting.PoWModeReplace:
			// PoW 完全替代 Turnstile
			requirePoW = true
		case operation_setting.PoWModeSupplement:
			// PoW + Turnstile 都需要
			requirePoW = true
		case operation_setting.PoWModeFallback:
			// Turnstile 不可用时使用 PoW
			requirePoW = !turnstileEnabled
		default:
			// 默认为 replace 模式
			requirePoW = true
		}

		if !requirePoW {
			c.Next()
			return
		}

		// 获取 PoW 参数
		challengeID := c.Query("pow_challenge")
		nonce := c.Query("pow_nonce")

		if challengeID == "" || nonce == "" {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "PoW challenge and nonce are required",
			})
			c.Abort()
			return
		}

		// 获取用户 ID
		userID := c.GetInt("id")
		if userID == 0 {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "User not authenticated",
			})
			c.Abort()
			return
		}

		// 验证 PoW
		if err := service.VerifyPoW(challengeID, nonce, userID); err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "PoW verification failed: " + err.Error(),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
