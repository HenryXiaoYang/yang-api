package controller

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

type userIPAccessLogView struct {
	Ip        string `json:"ip"`
	FirstSeen int64  `json:"first_seen"`
	LastSeen  int64  `json:"last_seen"`
}

type userRiskControlView struct {
	Id               int                    `json:"id"`
	Username         string                 `json:"username"`
	DisplayName      string                 `json:"display_name"`
	Email            string                 `json:"email"`
	Group            string                 `json:"group"`
	Status           int                    `json:"status"`
	Role             int                    `json:"role"`
	Remark           string                 `json:"remark"`
	Deleted          bool                   `json:"deleted"`
	RapidSwitchCount int                    `json:"rapid_switch_count"`
	AvgIPDuration    float64                `json:"avg_ip_duration"`
	RealSwitchCount  int                    `json:"real_switch_count"`
	IPRiskTags       []string               `json:"ip_risk_tags"`
	IPList           []string               `json:"ip_list"`
	IPLogs           []*userIPAccessLogView `json:"ip_logs"`
}

func GetUserRiskControlList(c *gin.Context) {
	if !service.IsUserControlEnabled() {
		common.ApiErrorMsg(c, "功能未启用")
		return
	}

	pageInfo := common.GetPageQuery(c)
	keyword := strings.TrimSpace(c.Query("keyword"))
	riskType := strings.TrimSpace(strings.ToUpper(c.Query("risk_type")))
	if !service.IsSupportedUserControlRiskType(riskType) {
		riskType = ""
	}
	ipSwitchConfig := service.GetIPSwitchDetectionConfig()

	var (
		users []*model.User
		total int64
		err   error
	)

	var riskUserIds []int
	var listErr error
	if riskType == "" {
		riskUserIds, listErr = service.ListAllRiskUserIds(ipSwitchConfig)
	} else {
		riskUserIds, listErr = service.ListRiskUserIdsByIPSwitch(riskType, ipSwitchConfig)
	}
	if listErr != nil {
		common.ApiError(c, listErr)
		return
	}
	users, total, err = model.SearchUsersByIds(keyword, riskUserIds, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}

	items, err := buildUserRiskControlViews(users, ipSwitchConfig)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

func buildUserRiskControlViews(users []*model.User, ipSwitchConfig service.IPSwitchDetectionConfig) ([]*userRiskControlView, error) {
	result := make([]*userRiskControlView, 0, len(users))
	if len(users) == 0 {
		return result, nil
	}

	userIds := make([]int, 0, len(users))
	for _, user := range users {
		userIds = append(userIds, user.Id)
	}

	ipSwitchMetricsMap, err := service.BuildUserIPSwitchMetricsByUserIds(userIds, ipSwitchConfig)
	if err != nil {
		return nil, err
	}

	for _, user := range users {
		ipMetrics := ipSwitchMetricsMap[user.Id]
		if ipMetrics == nil {
			ipMetrics = &service.UserIPSwitchMetrics{
				RiskTags:     []string{},
				RiskSegments: []*service.IPStaySegment{},
			}
		}

		// 从异常分段中提取 IP 列表和日志
		riskSegments := ipMetrics.RiskSegments
		ipLogViews := make([]*userIPAccessLogView, 0, len(riskSegments))
		ipSet := make(map[string]struct{})
		for _, segment := range riskSegments {
			ipLogViews = append(ipLogViews, &userIPAccessLogView{
				Ip:        segment.Ip,
				FirstSeen: segment.FirstSeen,
				LastSeen:  segment.LastSeen,
			})
			if segment.Ip != "" {
				ipSet[segment.Ip] = struct{}{}
			}
		}

		ipList := make([]string, 0, len(ipSet))
		for ip := range ipSet {
			ipList = append(ipList, ip)
		}

		result = append(result, &userRiskControlView{
			Id:               user.Id,
			Username:         user.Username,
			DisplayName:      user.DisplayName,
			Email:            user.Email,
			Group:            user.Group,
			Status:           user.Status,
			Role:             user.Role,
			Remark:           user.Remark,
			Deleted:          user.DeletedAt.Valid,
			RapidSwitchCount: ipMetrics.RapidSwitchCount,
			AvgIPDuration:    ipMetrics.AvgIPDuration,
			RealSwitchCount:  ipMetrics.RealSwitchCount,
			IPRiskTags:       ipMetrics.RiskTags,
			IPList:           ipList,
			IPLogs:           ipLogViews,
		})
	}

	return result, nil
}

func DeleteAllUserIPAccessLogs(c *gin.Context) {
	deletedCount, err := model.DeleteAllUserIPAccessLogs()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"deleted_count": deletedCount,
	})
}

func UnbanAllUsers(c *gin.Context) {
	updatedCount, err := model.EnableAllDisabledUsers()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"updated_count": updatedCount,
	})
}
