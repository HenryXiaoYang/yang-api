package model

import (
	"sort"

	"gorm.io/gorm"
)

type UserTLSFingerprint struct {
	Id           int    `json:"id" gorm:"primaryKey"`
	UserId       int    `json:"user_id" gorm:"not null;index:idx_tls_fp_user_last_seen,priority:1;uniqueIndex:idx_tls_fp_user_fingerprint,priority:1"`
	Fingerprint  string `json:"fingerprint" gorm:"type:varchar(128);not null;index:idx_tls_fp_fingerprint;uniqueIndex:idx_tls_fp_user_fingerprint,priority:2"`
	Source       string `json:"source" gorm:"type:varchar(64);default:''"`
	Ip           string `json:"ip" gorm:"type:varchar(64);default:''"`
	UserAgent    string `json:"user_agent" gorm:"type:varchar(255);default:''"`
	FirstSeen    int64  `json:"first_seen" gorm:"bigint;index"`
	LastSeen     int64  `json:"last_seen" gorm:"bigint;index:idx_tls_fp_user_last_seen,priority:2"`
	RequestCount int64  `json:"request_count" gorm:"bigint;default:1"`
}

func (UserTLSFingerprint) TableName() string {
	return "user_tls_fingerprints"
}

func UpsertUserTLSFingerprint(userId int, fingerprint, source, ip, userAgent string, now int64) error {
	if userId <= 0 || fingerprint == "" {
		return nil
	}

	updateFields := map[string]interface{}{
		"last_seen":     now,
		"request_count": gorm.Expr("request_count + ?", 1),
		"source":        source,
		"ip":            ip,
		"user_agent":    userAgent,
	}

	updateResult := DB.Model(&UserTLSFingerprint{}).
		Where("user_id = ? AND fingerprint = ?", userId, fingerprint).
		Updates(updateFields)
	if updateResult.Error != nil {
		return updateResult.Error
	}
	if updateResult.RowsAffected > 0 {
		return nil
	}

	newRecord := UserTLSFingerprint{
		UserId:       userId,
		Fingerprint:  fingerprint,
		Source:       source,
		Ip:           ip,
		UserAgent:    userAgent,
		FirstSeen:    now,
		LastSeen:     now,
		RequestCount: 1,
	}
	if err := DB.Create(&newRecord).Error; err != nil {
		// 并发写入时可能发生唯一键冲突，退化为再更新一次
		retryErr := DB.Model(&UserTLSFingerprint{}).
			Where("user_id = ? AND fingerprint = ?", userId, fingerprint).
			Updates(updateFields).Error
		if retryErr != nil {
			return err
		}
	}
	return nil
}

func ListUserTLSFingerprintsByUserIds(userIds []int) ([]*UserTLSFingerprint, error) {
	if len(userIds) == 0 {
		return []*UserTLSFingerprint{}, nil
	}
	var records []*UserTLSFingerprint
	err := DB.Where("user_id IN ?", userIds).
		Order("user_id ASC").
		Order("last_seen DESC").
		Find(&records).Error
	return records, err
}

func GetFingerprintUserIdsMap(fingerprints []string) (map[string][]int, error) {
	result := make(map[string][]int)
	if len(fingerprints) == 0 {
		return result, nil
	}

	type row struct {
		Fingerprint string `gorm:"column:fingerprint"`
		UserId      int    `gorm:"column:user_id"`
	}

	var rows []row
	err := DB.Model(&UserTLSFingerprint{}).
		Select("fingerprint, user_id").
		Where("fingerprint IN ?", fingerprints).
		Find(&rows).Error
	if err != nil {
		return nil, err
	}

	seen := make(map[string]map[int]struct{})
	for _, item := range rows {
		if _, ok := seen[item.Fingerprint]; !ok {
			seen[item.Fingerprint] = make(map[int]struct{})
		}
		seen[item.Fingerprint][item.UserId] = struct{}{}
	}

	for fingerprint, userSet := range seen {
		userIds := make([]int, 0, len(userSet))
		for userId := range userSet {
			userIds = append(userIds, userId)
		}
		sort.Ints(userIds)
		result[fingerprint] = userIds
	}

	return result, nil
}

func GetUsersByIds(userIds []int) (map[int]*User, error) {
	result := make(map[int]*User)
	if len(userIds) == 0 {
		return result, nil
	}
	var users []*User
	err := DB.Unscoped().Omit("password").Where("id IN ?", userIds).Find(&users).Error
	if err != nil {
		return nil, err
	}
	for _, user := range users {
		result[user.Id] = user
	}
	return result, nil
}
