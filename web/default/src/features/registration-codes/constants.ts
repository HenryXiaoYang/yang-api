export const REGISTRATION_CODE_STATUS = {
  ACTIVE: 1,
  DISABLED: 2,
  USED: 3,
} as const

export const REGISTRATION_CODE_VALIDATION = {
  NAME_MIN_LENGTH: 1,
  COUNT_MIN: 1,
  COUNT_MAX: 10000,
} as const

export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
