package controller

import (
	"net/http"
	"strconv"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

func GetAllRegistrationCodes(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	codes, total, err := model.GetAllRegistrationCodes(pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(codes)
	common.ApiSuccess(c, pageInfo)
}

func SearchRegistrationCodes(c *gin.Context) {
	keyword := c.Query("keyword")
	pageInfo := common.GetPageQuery(c)
	codes, total, err := model.SearchRegistrationCodes(keyword, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(codes)
	common.ApiSuccess(c, pageInfo)
}

func GetRegistrationCode(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	code, err := model.GetRegistrationCodeById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    code,
	})
}

func AddRegistrationCode(c *gin.Context) {
	rc := model.RegistrationCode{}
	err := c.ShouldBindJSON(&rc)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if utf8.RuneCountInString(rc.Name) == 0 || utf8.RuneCountInString(rc.Name) > 20 {
		common.ApiErrorI18n(c, i18n.MsgRegCodeNameLength)
		return
	}
	if rc.Count <= 0 {
		common.ApiErrorI18n(c, i18n.MsgRegCodeCountPositive)
		return
	}
	if rc.Count > 10000 {
		common.ApiErrorI18n(c, i18n.MsgRegCodeCountMax)
		return
	}
	if valid, msg := validateRegCodeExpiredTime(c, rc.ExpiredTime); !valid {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": msg})
		return
	}
	var codes []string
	for i := 0; i < rc.Count; i++ {
		code := common.GetUUID()
		cleanCode := model.RegistrationCode{
			Name:        rc.Name,
			Code:        code,
			CreatedTime: common.GetTimestamp(),
			ExpiredTime: rc.ExpiredTime,
		}
		err = cleanCode.Insert()
		if err != nil {
			common.SysError("failed to insert registration code: " + err.Error())
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": i18n.T(c, i18n.MsgRegCodeCreateFailed),
				"data":    codes,
			})
			return
		}
		codes = append(codes, code)
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    codes,
	})
}

func DeleteRegistrationCode(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	err := model.DeleteRegistrationCodeById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func UpdateRegistrationCode(c *gin.Context) {
	statusOnly := c.Query("status_only")
	rc := model.RegistrationCode{}
	err := c.ShouldBindJSON(&rc)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	cleanCode, err := model.GetRegistrationCodeById(rc.Id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if statusOnly == "" {
		if valid, msg := validateRegCodeExpiredTime(c, rc.ExpiredTime); !valid {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": msg})
			return
		}
		cleanCode.Name = rc.Name
		cleanCode.ExpiredTime = rc.ExpiredTime
	}
	if statusOnly != "" {
		cleanCode.Status = rc.Status
	}
	err = cleanCode.Update()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    cleanCode,
	})
}

func DeleteInvalidRegistrationCodes(c *gin.Context) {
	rows, err := model.DeleteInvalidRegistrationCodes()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    rows,
	})
}

func validateRegCodeExpiredTime(c *gin.Context, expired int64) (bool, string) {
	if expired != 0 && expired < common.GetTimestamp() {
		return false, i18n.T(c, i18n.MsgRegCodeExpireInvalid)
	}
	return true, ""
}
