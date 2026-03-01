package service

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/setting/operation_setting"
)

// PoWChallenge 表示一个 PoW 挑战
type PoWChallenge struct {
	ID         string `json:"challenge_id"`
	UserID     int    `json:"user_id"`
	Action     string `json:"action"`
	Prefix     string `json:"prefix"`     // "action:timestamp:userId:salt:"
	Difficulty int    `json:"difficulty"` // 前导零 bits 数
	ExpiresAt  int64  `json:"expires_at"` // Unix 时间戳
	Used       bool   `json:"used"`       // 是否已使用
}

// 内存缓存存储 challenges
var (
	challengeStore = sync.Map{}
)

// generateRandomHex 生成指定长度的随机十六进制字符串
func generateRandomHex(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// GeneratePoWChallenge 生成一个新的 PoW challenge
func GeneratePoWChallenge(userID int, action string) (*PoWChallenge, error) {
	// 生成随机 ID
	id, err := generateRandomHex(16)
	if err != nil {
		return nil, fmt.Errorf("failed to generate challenge ID: %w", err)
	}

	// 生成随机盐值
	salt, err := generateRandomHex(8)
	if err != nil {
		return nil, fmt.Errorf("failed to generate salt: %w", err)
	}

	timestamp := time.Now().Unix()
	ttl := operation_setting.GetPoWChallengeTTL()
	difficulty := operation_setting.GetPoWDifficulty()

	// 构建 prefix: action:timestamp:userId:salt:
	prefix := fmt.Sprintf("%s:%d:%d:%s:", action, timestamp, userID, salt)

	challenge := &PoWChallenge{
		ID:         id,
		UserID:     userID,
		Action:     action,
		Prefix:     prefix,
		Difficulty: difficulty,
		ExpiresAt:  timestamp + int64(ttl),
		Used:       false,
	}

	// 存储到内存缓存
	challengeStore.Store(id, challenge)

	// 启动清理协程（可选，防止内存泄漏）
	go func() {
		time.Sleep(time.Duration(ttl+60) * time.Second)
		challengeStore.Delete(id)
	}()

	return challenge, nil
}

// VerifyPoW 验证 PoW 解答
func VerifyPoW(challengeID, nonce string, userID int) error {
	// 从缓存获取 challenge
	value, ok := challengeStore.Load(challengeID)
	if !ok {
		return errors.New("challenge not found or expired")
	}

	challenge, ok := value.(*PoWChallenge)
	if !ok {
		return errors.New("invalid challenge data")
	}

	// 验证用户 ID
	if challenge.UserID != userID {
		return errors.New("challenge does not belong to this user")
	}

	// 检查是否已过期
	if time.Now().Unix() > challenge.ExpiresAt {
		challengeStore.Delete(challengeID)
		return errors.New("challenge has expired")
	}

	// 检查是否已使用
	if challenge.Used {
		return errors.New("challenge has already been used")
	}

	// 计算哈希并验证前导零
	data := challenge.Prefix + nonce
	hash := sha256.Sum256([]byte(data))

	if !hasLeadingZeroBits(hash[:], challenge.Difficulty) {
		return errors.New("invalid PoW solution")
	}

	// 标记为已使用
	challenge.Used = true
	challengeStore.Store(challengeID, challenge)

	return nil
}

// hasLeadingZeroBits 检查哈希是否有指定数量的前导零 bits
func hasLeadingZeroBits(hash []byte, bits int) bool {
	if bits <= 0 {
		return true
	}

	fullBytes := bits / 8
	remainingBits := bits % 8

	// 检查完整字节
	for i := 0; i < fullBytes && i < len(hash); i++ {
		if hash[i] != 0 {
			return false
		}
	}

	// 检查剩余 bits
	if remainingBits > 0 && fullBytes < len(hash) {
		// 创建掩码：如果 remainingBits = 3，掩码 = 11100000 = 0xE0
		mask := byte(0xFF << (8 - remainingBits))
		if (hash[fullBytes] & mask) != 0 {
			return false
		}
	}

	return true
}

// GetChallenge 根据 ID 获取 challenge（用于调试或状态查询）
func GetChallenge(challengeID string) (*PoWChallenge, bool) {
	value, ok := challengeStore.Load(challengeID)
	if !ok {
		return nil, false
	}
	challenge, ok := value.(*PoWChallenge)
	return challenge, ok
}

// CleanupExpiredChallenges 清理所有过期的 challenges
func CleanupExpiredChallenges() int {
	now := time.Now().Unix()
	count := 0

	challengeStore.Range(func(key, value interface{}) bool {
		if challenge, ok := value.(*PoWChallenge); ok {
			if now > challenge.ExpiresAt {
				challengeStore.Delete(key)
				count++
			}
		}
		return true
	})

	return count
}
