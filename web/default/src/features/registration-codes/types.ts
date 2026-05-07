export interface RegistrationCode {
  id: number
  name: string
  code: string
  status: 1 | 2 | 3 // 1=ACTIVE, 2=DISABLED, 3=USED
  created_time: number
  expired_time: number // 0 = never expires
  used_user_id: number // 0 = unused
}

export interface RegistrationCodeFormData {
  name: string
  count?: number // Only for creation
  expired_time?: Date | null
}

export interface GetRegistrationCodesParams {
  p?: number
  page_size?: number
}

export interface SearchRegistrationCodesParams {
  keyword?: string
  p?: number
  page_size?: number
}

export interface GetRegistrationCodesResponse {
  success: boolean
  message: string
  data: RegistrationCode[]
  total?: number
}

export interface CreateRegistrationCodePayload {
  name: string
  count: number
  expired_time: number // Unix timestamp, 0 = never expires
}

export interface UpdateRegistrationCodePayload {
  id: number
  name?: string
  expired_time?: number
  status?: 1 | 2 | 3
}

export type RegistrationCodesDialogType = 'create' | 'edit' | 'delete' | null
