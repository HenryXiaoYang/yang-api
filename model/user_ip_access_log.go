package model

import (
	"sort"

	"gorm.io/gorm"
)

type UserIPAccessLog struct {
	Id     int    `json:"id" gorm:"primaryKey"`
	UserId int    `json:"user_id" gorm:"not null;index:idx_user_ip_access_user_seen,priority:1;index:idx_user_ip_access_user_ip_seen,priority:1"`
	Ip     string `json:"ip" gorm:"type:varchar(64);not null;default:'';index:idx_user_ip_access_user_ip_seen,priority:2"`
	SeenAt int64  `json:"seen_at" gorm:"bigint;not null;index:idx_user_ip_access_user_seen,priority:2;index"`
}

func (UserIPAccessLog) TableName() string {
	return "user_ip_access_logs"
}

func CreateUserIPAccessLog(userId int, ip string, seenAt int64) error {
	if userId <= 0 || ip == "" || seenAt <= 0 {
		return nil
	}
	record := UserIPAccessLog{
		UserId: userId,
		Ip:     ip,
		SeenAt: seenAt,
	}
	return DB.Create(&record).Error
}

func ListUserIPAccessLogsByUserIds(userIds []int, limitPerUser int) (map[int][]*UserIPAccessLog, error) {
	result := make(map[int][]*UserIPAccessLog)
	if len(userIds) == 0 {
		return result, nil
	}

	var records []*UserIPAccessLog
	err := DB.Where("user_id IN ?", userIds).
		Order("user_id ASC").
		Order("seen_at DESC").
		Find(&records).Error
	if err != nil {
		return nil, err
	}

	userCounts := make(map[int]int)
	for _, record := range records {
		if limitPerUser > 0 && userCounts[record.UserId] >= limitPerUser {
			continue
		}
		result[record.UserId] = append(result[record.UserId], record)
		userCounts[record.UserId]++
	}

	for userId := range result {
		sort.Slice(result[userId], func(i, j int) bool {
			return result[userId][i].SeenAt < result[userId][j].SeenAt
		})
	}
	return result, nil
}

func ListUserIdsWithIPAccessLogs() ([]int, error) {
	var userIds []int
	err := DB.Model(&UserIPAccessLog{}).
		Distinct("user_id").
		Pluck("user_id", &userIds).Error
	if err != nil {
		return nil, err
	}
	sort.Ints(userIds)
	return userIds, nil
}

func DeleteAllUserIPAccessLogs() (int64, error) {
	result := DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&UserIPAccessLog{})
	return result.RowsAffected, result.Error
}
