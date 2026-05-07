import type { TFunction } from 'i18next'
import { z } from 'zod'
import { REGISTRATION_CODE_VALIDATION } from '../constants'
import type { CreateRegistrationCodePayload, RegistrationCode, RegistrationCodeFormData } from '../types'

export function getRegistrationCodeFormSchema(t: TFunction) {
  return z.object({
    name: z
      .string()
      .min(REGISTRATION_CODE_VALIDATION.NAME_MIN_LENGTH, t('Name is required')),
    count: z
      .number()
      .min(REGISTRATION_CODE_VALIDATION.COUNT_MIN, t('Count must be at least 1'))
      .max(REGISTRATION_CODE_VALIDATION.COUNT_MAX, t('Count cannot exceed 10000'))
      .optional(),
    expired_time: z.date().nullable().optional(),
  })
}

export type RegistrationCodeFormSchema = ReturnType<typeof getRegistrationCodeFormSchema>

export function transformFormDataToCreatePayload(
  data: RegistrationCodeFormData
): CreateRegistrationCodePayload {
  return {
    name: data.name,
    count: data.count || 1,
    expired_time: data.expired_time ? Math.floor(data.expired_time.getTime() / 1000) : 0,
  }
}

export function transformFormDataToUpdatePayload(
  id: number,
  data: RegistrationCodeFormData
): { id: number; name: string; expired_time: number } {
  return {
    id,
    name: data.name,
    expired_time: data.expired_time ? Math.floor(data.expired_time.getTime() / 1000) : 0,
  }
}

export function transformRegistrationCodeToFormDefaults(
  code: RegistrationCode
): RegistrationCodeFormData {
  return {
    name: code.name,
    expired_time: code.expired_time > 0 ? new Date(code.expired_time * 1000) : null,
  }
}
