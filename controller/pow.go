package controller

import (
	"net/http"

	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

// GetPoWChallenge 获取 PoW challenge
func GetPoWChallenge(c *gin.Context) {
	// 检查 PoW 是否启用
	if !operation_setting.IsPoWEnabled() {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "PoW is not enabled",
		})
		return
	}

	// 获取 action 参数
	action := c.DefaultQuery("action", "checkin")

	// 获取用户 ID
	userID := c.GetInt("id")
	if userID == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// 生成 challenge
	challenge, err := service.GeneratePoWChallenge(userID, action)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Failed to generate challenge: " + err.Error(),
		})
		return
	}

	// 返回 challenge 信息
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": dto.PoWChallengeResponse{
			ChallengeID: challenge.ID,
			Prefix:      challenge.Prefix,
			Difficulty:  challenge.Difficulty,
			ExpiresAt:   challenge.ExpiresAt,
		},
	})
}
