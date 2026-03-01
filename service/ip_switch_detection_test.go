package service

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/require"
)

func TestAnalyzeUserIPSwitchLogsSortsBeforeAnalyze(t *testing.T) {
	t.Parallel()

	logs := []*model.UserIPAccessLog{
		{Id: 1, UserId: 1, Ip: "1.1.1.1", SeenAt: 300},
		{Id: 2, UserId: 1, Ip: "2.2.2.2", SeenAt: 100},
		{Id: 3, UserId: 1, Ip: "1.1.1.1", SeenAt: 200},
		{Id: 4, UserId: 1, Ip: "2.2.2.2", SeenAt: 400},
	}
	cfg := IPSwitchDetectionConfig{
		RapidSwitchThreshold: 99,
		RapidSwitchDuration:  300,
		HoppingThreshold:     99,
		HoppingDuration:      30,
	}

	metrics := AnalyzeUserIPSwitchLogs(logs, cfg)
	require.Equal(t, 2, metrics.RapidSwitchCount)
	require.Equal(t, 1, metrics.RealSwitchCount)
}

func TestAnalyzeUserIPSwitchLogsRealSwitchUsesUniqueIPCount(t *testing.T) {
	t.Parallel()

	logs := []*model.UserIPAccessLog{
		{Id: 1, UserId: 1, Ip: "10.0.0.1", SeenAt: 10},
		{Id: 2, UserId: 1, Ip: "10.0.0.2", SeenAt: 20},
		{Id: 3, UserId: 1, Ip: "10.0.0.1", SeenAt: 30},
	}

	metrics := AnalyzeUserIPSwitchLogs(logs, IPSwitchDetectionConfig{})
	require.Equal(t, 1, metrics.RealSwitchCount)
}
