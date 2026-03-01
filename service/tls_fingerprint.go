package service

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/bytedance/gopkg/util/gopool"
	"github.com/gin-gonic/gin"
)

var tlsFingerprintHeaderCandidates = []string{
	"x-ja3-fingerprint",
	"ja3-fingerprint",
	"cf-ja3",
	"x-client-ja3",
	"x-ja4-fingerprint",
	"ja4-fingerprint",
	"x-client-ja4",
	"x-tls-fingerprint",
}

func BuildTLSFingerprint(c *gin.Context) (string, string) {
	if c == nil || c.Request == nil {
		return "", ""
	}

	for _, header := range tlsFingerprintHeaderCandidates {
		value := strings.TrimSpace(c.GetHeader(header))
		if value == "" {
			continue
		}
		source := "header:" + header
		return normalizeHeaderFingerprint(value, header), source
	}

	userAgent := normalizeClientHint(c.Request.UserAgent(), 128)
	secCHUA := normalizeClientHint(c.GetHeader("Sec-CH-UA"), 128)
	secCHUAPlatform := normalizeClientHint(c.GetHeader("Sec-CH-UA-Platform"), 64)
	acceptLanguage := normalizeClientHint(c.GetHeader("Accept-Language"), 64)

	if c.Request.TLS != nil {
		raw := fmt.Sprintf(
			"tls-v=%d|cipher=%d|alpn=%s|sni=%s|resume=%t|ua=%s|sec_ch_ua=%s|sec_ch_platform=%s|lang=%s",
			c.Request.TLS.Version,
			c.Request.TLS.CipherSuite,
			normalizeClientHint(c.Request.TLS.NegotiatedProtocol, 32),
			normalizeClientHint(strings.ToLower(c.Request.TLS.ServerName), 64),
			c.Request.TLS.DidResume,
			userAgent,
			secCHUA,
			secCHUAPlatform,
			acceptLanguage,
		)
		return "tlsmeta:" + shortFingerprintHash(raw), "tls-meta"
	}

	if userAgent != "" || secCHUA != "" || secCHUAPlatform != "" {
		raw := fmt.Sprintf(
			"http-ua=%s|sec_ch_ua=%s|sec_ch_platform=%s|lang=%s",
			userAgent,
			secCHUA,
			secCHUAPlatform,
			acceptLanguage,
		)
		return "httpmeta:" + shortFingerprintHash(raw), "http-meta"
	}

	return "", ""
}

func TrackUserTLSFingerprint(c *gin.Context, userId int) {
	if userId <= 0 {
		return
	}
	fingerprint, source := BuildTLSFingerprint(c)
	if fingerprint == "" {
		return
	}

	ip := normalizeClientHint(c.ClientIP(), 64)
	userAgent := normalizeClientHint(c.Request.UserAgent(), 255)
	now := int64(common.GetTimestamp())

	gopool.Go(func() {
		if err := model.UpsertUserTLSFingerprint(userId, fingerprint, source, ip, userAgent, now); err != nil {
			common.SysLog(fmt.Sprintf("failed to record tls fingerprint for user %d: %v", userId, err))
		}
	})
}

func normalizeHeaderFingerprint(value, header string) string {
	normalized := normalizeClientHint(strings.ToLower(strings.ReplaceAll(value, " ", "")), 256)
	fingerprintType := "tls"
	if strings.Contains(header, "ja4") {
		fingerprintType = "ja4"
	} else if strings.Contains(header, "ja3") {
		fingerprintType = "ja3"
	}
	if normalized == "" {
		return fingerprintType + ":" + shortFingerprintHash(value)
	}
	if len(normalized) > 96 {
		return fingerprintType + ":" + shortFingerprintHash(normalized)
	}
	return fingerprintType + ":" + normalized
}

func shortFingerprintHash(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:12])
}

func normalizeClientHint(value string, maxLength int) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if len(value) > maxLength {
		return value[:maxLength]
	}
	return value
}
