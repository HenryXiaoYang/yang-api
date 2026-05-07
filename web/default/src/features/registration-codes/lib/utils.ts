import type { TFunction } from 'i18next'
import { REGISTRATION_CODE_STATUS } from '../constants'
import type { RegistrationCode } from '../types'

export function getStatusLabel(status: 1 | 2 | 3, t: TFunction): string {
  switch (status) {
    case REGISTRATION_CODE_STATUS.ACTIVE:
      return t('Active')
    case REGISTRATION_CODE_STATUS.DISABLED:
      return t('Disabled')
    case REGISTRATION_CODE_STATUS.USED:
      return t('Used')
    default:
      return t('Unknown')
  }
}

export function getStatusVariant(
  status: 1 | 2 | 3
): 'default' | 'secondary' | 'success' | 'destructive' {
  switch (status) {
    case REGISTRATION_CODE_STATUS.ACTIVE:
      return 'success'
    case REGISTRATION_CODE_STATUS.DISABLED:
      return 'secondary'
    case REGISTRATION_CODE_STATUS.USED:
      return 'default'
    default:
      return 'secondary'
  }
}

export function isCodeExpired(code: RegistrationCode): boolean {
  if (code.expired_time === 0) return false
  return code.expired_time * 1000 < Date.now()
}

export function isCodeActive(code: RegistrationCode): boolean {
  return code.status === REGISTRATION_CODE_STATUS.ACTIVE && !isCodeExpired(code)
}

export function formatTimestamp(timestamp: number, t: TFunction): string {
  if (timestamp === 0) return t('Never')
  return new Date(timestamp * 1000).toLocaleString()
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export function downloadCodes(codes: string[], filename = 'registration-codes.txt'): void {
  const content = codes.join('\n')
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
