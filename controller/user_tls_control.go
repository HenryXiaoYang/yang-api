package controller

import (
	"sort"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

type tlsRelatedUser struct {
	Id       int    `json:"id"`
	Username string `json:"username"`
	Status   int    `json:"status"`
}

type userTLSFingerprintView struct {
	Fingerprint     string            `json:"fingerprint"`
	Source          string            `json:"source"`
	FirstSeen       int64             `json:"first_seen"`
	LastSeen        int64             `json:"last_seen"`
	RequestCount    int64             `json:"request_count"`
	SharedUserCount int               `json:"shared_user_count"`
	SharedUsers     []*tlsRelatedUser `json:"shared_users"`
}

type userTLSControlView struct {
	Id                     int                       `json:"id"`
	Username               string                    `json:"username"`
	DisplayName            string                    `json:"display_name"`
	Email                  string                    `json:"email"`
	Group                  string                    `json:"group"`
	Status                 int                       `json:"status"`
	Role                   int                       `json:"role"`
	Remark                 string                    `json:"remark"`
	Deleted                bool                      `json:"deleted"`
	LatestFingerprint      string                    `json:"latest_fingerprint"`
	LatestSeen             int64                     `json:"latest_seen"`
	FingerprintCount       int                       `json:"fingerprint_count"`
	SharedFingerprintCount int                       `json:"shared_fingerprint_count"`
	RapidSwitchCount       int                       `json:"rapid_switch_count"`
	AvgIPDuration          float64                   `json:"avg_ip_duration"`
	RealSwitchCount        int                       `json:"real_switch_count"`
	IPRiskTags             []string                  `json:"ip_risk_tags"`
	SuspectedAlt           bool                      `json:"suspected_alt"`
	RelatedUsers           []*tlsRelatedUser         `json:"related_users"`
	Fingerprints           []*userTLSFingerprintView `json:"fingerprints"`
}

func GetUserTLSControlList(c *gin.Context) {
	if !service.IsUserControlEnabled() {
		common.ApiErrorMsg(c, "功能未启用")
		return
	}

	pageInfo := common.GetPageQuery(c)
	keyword := strings.TrimSpace(c.Query("keyword"))
	riskType := strings.TrimSpace(strings.ToUpper(c.Query("risk_type")))
	if riskType != service.IPRiskRapidSwitch && riskType != service.IPRiskHopping {
		riskType = ""
	}
	ipSwitchConfig := service.GetIPSwitchDetectionConfig()

	var (
		users []*model.User
		total int64
		err   error
	)

	if riskType == "" {
		if keyword == "" {
			users, total, err = model.GetAllUsers(pageInfo)
		} else {
			users, total, err = model.SearchUsers(keyword, "", map[string]string{}, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
		}
	} else {
		var riskUserIds []int
		riskUserIds, err = service.ListRiskUserIdsByIPSwitch(riskType, ipSwitchConfig)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		users, total, err = model.SearchUsersByIds(keyword, riskUserIds, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	}
	if err != nil {
		common.ApiError(c, err)
		return
	}

	items, err := buildUserTLSControlViews(users, ipSwitchConfig)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

func buildUserTLSControlViews(users []*model.User, ipSwitchConfig service.IPSwitchDetectionConfig) ([]*userTLSControlView, error) {
	result := make([]*userTLSControlView, 0, len(users))
	if len(users) == 0 {
		return result, nil
	}

	userIds := make([]int, 0, len(users))
	for _, user := range users {
		userIds = append(userIds, user.Id)
	}

	fingerprintRecords, err := model.ListUserTLSFingerprintsByUserIds(userIds)
	if err != nil {
		return nil, err
	}
	ipSwitchMetricsMap, err := service.BuildUserIPSwitchMetricsByUserIds(userIds, ipSwitchConfig)
	if err != nil {
		return nil, err
	}

	userFingerprintMap := make(map[int][]*model.UserTLSFingerprint)
	fingerprintSet := make(map[string]struct{})
	for _, record := range fingerprintRecords {
		userFingerprintMap[record.UserId] = append(userFingerprintMap[record.UserId], record)
		fingerprintSet[record.Fingerprint] = struct{}{}
	}

	fingerprints := make([]string, 0, len(fingerprintSet))
	for fingerprint := range fingerprintSet {
		fingerprints = append(fingerprints, fingerprint)
	}
	fingerprintUserIdsMap, err := model.GetFingerprintUserIdsMap(fingerprints)
	if err != nil {
		return nil, err
	}

	relatedUserIdSet := make(map[int]struct{})
	for _, ids := range fingerprintUserIdsMap {
		for _, id := range ids {
			relatedUserIdSet[id] = struct{}{}
		}
	}
	relatedUserIds := make([]int, 0, len(relatedUserIdSet))
	for userId := range relatedUserIdSet {
		relatedUserIds = append(relatedUserIds, userId)
	}
	relatedUsersMap, err := model.GetUsersByIds(relatedUserIds)
	if err != nil {
		return nil, err
	}

	for _, user := range users {
		userFingerprints := userFingerprintMap[user.Id]
		sort.Slice(userFingerprints, func(i, j int) bool {
			return userFingerprints[i].LastSeen > userFingerprints[j].LastSeen
		})
		ipMetrics := ipSwitchMetricsMap[user.Id]
		if ipMetrics == nil {
			ipMetrics = &service.UserIPSwitchMetrics{
				RiskTags: []string{},
			}
		}

		relatedByUser := make(map[int]*tlsRelatedUser)
		fingerprintViews := make([]*userTLSFingerprintView, 0, len(userFingerprints))

		latestFingerprint := ""
		var latestSeen int64
		sharedFingerprintCount := 0

		for _, fp := range userFingerprints {
			sharedUsers := buildRelatedUsers(fingerprintUserIdsMap[fp.Fingerprint], relatedUsersMap, user.Id, 20)
			if len(sharedUsers) > 0 {
				sharedFingerprintCount++
				for _, sharedUser := range sharedUsers {
					relatedByUser[sharedUser.Id] = sharedUser
				}
			}

			if fp.LastSeen > latestSeen {
				latestSeen = fp.LastSeen
				latestFingerprint = fp.Fingerprint
			}

			fingerprintViews = append(fingerprintViews, &userTLSFingerprintView{
				Fingerprint:     fp.Fingerprint,
				Source:          fp.Source,
				FirstSeen:       fp.FirstSeen,
				LastSeen:        fp.LastSeen,
				RequestCount:    fp.RequestCount,
				SharedUserCount: len(sharedUsers),
				SharedUsers:     sharedUsers,
			})
		}

		relatedUsers := make([]*tlsRelatedUser, 0, len(relatedByUser))
		for _, relatedUser := range relatedByUser {
			relatedUsers = append(relatedUsers, relatedUser)
		}
		sort.Slice(relatedUsers, func(i, j int) bool {
			return relatedUsers[i].Id < relatedUsers[j].Id
		})

		result = append(result, &userTLSControlView{
			Id:                     user.Id,
			Username:               user.Username,
			DisplayName:            user.DisplayName,
			Email:                  user.Email,
			Group:                  user.Group,
			Status:                 user.Status,
			Role:                   user.Role,
			Remark:                 user.Remark,
			Deleted:                user.DeletedAt.Valid,
			LatestFingerprint:      latestFingerprint,
			LatestSeen:             latestSeen,
			FingerprintCount:       len(userFingerprints),
			SharedFingerprintCount: sharedFingerprintCount,
			RapidSwitchCount:       ipMetrics.RapidSwitchCount,
			AvgIPDuration:          ipMetrics.AvgIPDuration,
			RealSwitchCount:        ipMetrics.RealSwitchCount,
			IPRiskTags:             ipMetrics.RiskTags,
			SuspectedAlt:           len(relatedUsers) > 0,
			RelatedUsers:           relatedUsers,
			Fingerprints:           fingerprintViews,
		})
	}

	return result, nil
}

func buildRelatedUsers(userIds []int, usersMap map[int]*model.User, currentUserId int, limit int) []*tlsRelatedUser {
	if len(userIds) == 0 {
		return []*tlsRelatedUser{}
	}
	relatedUsers := make([]*tlsRelatedUser, 0, len(userIds))
	for _, userId := range userIds {
		if userId == currentUserId {
			continue
		}
		user := usersMap[userId]
		if user == nil {
			continue
		}
		relatedUsers = append(relatedUsers, &tlsRelatedUser{
			Id:       user.Id,
			Username: user.Username,
			Status:   user.Status,
		})
	}

	sort.Slice(relatedUsers, func(i, j int) bool {
		return relatedUsers[i].Id < relatedUsers[j].Id
	})

	if limit > 0 && len(relatedUsers) > limit {
		return relatedUsers[:limit]
	}
	return relatedUsers
}
