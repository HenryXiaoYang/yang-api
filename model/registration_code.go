package model

import (
	"errors"
	"strconv"

	"github.com/QuantumNous/new-api/common"

	"gorm.io/gorm"
)

type RegistrationCode struct {
	Id          int            `json:"id"`
	Code        string         `json:"code" gorm:"type:char(32);uniqueIndex"`
	Status      int            `json:"status" gorm:"default:1"`
	Name        string         `json:"name" gorm:"index"`
	UsedUserId  int            `json:"used_user_id"`
	Count       int            `json:"count" gorm:"-:all"` // only for api request
	CreatedTime int64          `json:"created_time" gorm:"bigint"`
	UsedTime    int64          `json:"used_time" gorm:"bigint"`
	ExpiredTime int64          `json:"expired_time" gorm:"bigint"` // 0 means no expiry
	DeletedAt   gorm.DeletedAt `gorm:"index"`
}

func GetAllRegistrationCodes(startIdx int, num int) (codes []*RegistrationCode, total int64, err error) {
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	err = tx.Model(&RegistrationCode{}).Count(&total).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	err = tx.Order("id desc").Limit(num).Offset(startIdx).Find(&codes).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}

	return codes, total, nil
}

func SearchRegistrationCodes(keyword string, startIdx int, num int) (codes []*RegistrationCode, total int64, err error) {
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	query := tx.Model(&RegistrationCode{})

	if id, err := strconv.Atoi(keyword); err == nil {
		query = query.Where("id = ? OR name LIKE ?", id, keyword+"%")
	} else {
		query = query.Where("name LIKE ?", keyword+"%")
	}

	err = query.Count(&total).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	err = query.Order("id desc").Limit(num).Offset(startIdx).Find(&codes).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}

	return codes, total, nil
}

func GetRegistrationCodeById(id int) (*RegistrationCode, error) {
	if id == 0 {
		return nil, errors.New("id 为空！")
	}
	code := RegistrationCode{Id: id}
	err := DB.First(&code, "id = ?", id).Error
	return &code, err
}

func ValidateRegistrationCode(code string) error {
	if code == "" {
		return errors.New("registration code not provided")
	}
	rc := &RegistrationCode{}
	err := DB.Where("code = ?", code).First(rc).Error
	if err != nil {
		return errors.New("invalid registration code")
	}
	if rc.Status == common.RegistrationCodeStatusDisabled {
		return errors.New("registration code is disabled")
	}
	if rc.Status == common.RegistrationCodeStatusUsed {
		return errors.New("registration code has been used")
	}
	if rc.ExpiredTime != 0 && rc.ExpiredTime < common.GetTimestamp() {
		return errors.New("registration code has expired")
	}
	return nil
}

func UseRegistrationCode(code string, userId int) error {
	if code == "" {
		return errors.New("registration code not provided")
	}
	if userId == 0 {
		return errors.New("invalid user id")
	}

	common.RandomSleep()
	return DB.Transaction(func(tx *gorm.DB) error {
		rc := &RegistrationCode{}
		err := tx.Set("gorm:query_option", "FOR UPDATE").Where("code = ?", code).First(rc).Error
		if err != nil {
			return errors.New("invalid registration code")
		}
		if rc.Status != common.RegistrationCodeStatusActive {
			return errors.New("registration code is not active")
		}
		if rc.ExpiredTime != 0 && rc.ExpiredTime < common.GetTimestamp() {
			return errors.New("registration code has expired")
		}
		rc.UsedTime = common.GetTimestamp()
		rc.Status = common.RegistrationCodeStatusUsed
		rc.UsedUserId = userId
		return tx.Save(rc).Error
	})
}

func (rc *RegistrationCode) Insert() error {
	return DB.Create(rc).Error
}

func (rc *RegistrationCode) Update() error {
	return DB.Model(rc).Select("name", "status", "expired_time").Updates(rc).Error
}

func (rc *RegistrationCode) Delete() error {
	return DB.Delete(rc).Error
}

func DeleteRegistrationCodeById(id int) error {
	if id == 0 {
		return errors.New("id 为空！")
	}
	code := RegistrationCode{Id: id}
	err := DB.Where(code).First(&code).Error
	if err != nil {
		return err
	}
	return code.Delete()
}

func DeleteInvalidRegistrationCodes() (int64, error) {
	now := common.GetTimestamp()
	result := DB.Where(
		"status IN ? OR (status = ? AND expired_time != 0 AND expired_time < ?)",
		[]int{common.RegistrationCodeStatusUsed, common.RegistrationCodeStatusDisabled},
		common.RegistrationCodeStatusActive,
		now,
	).Delete(&RegistrationCode{})
	return result.RowsAffected, result.Error
}
