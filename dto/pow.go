package dto

// PoWChallengeResponse PoW challenge 响应
type PoWChallengeResponse struct {
	ChallengeID string `json:"challenge_id"`
	Prefix      string `json:"prefix"`
	Difficulty  int    `json:"difficulty"`
	ExpiresAt   int64  `json:"expires_at"`
}
