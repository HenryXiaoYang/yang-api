import { api } from '@/lib/api'
import type {
  CreateRegistrationCodePayload,
  GetRegistrationCodesParams,
  GetRegistrationCodesResponse,
  RegistrationCode,
  SearchRegistrationCodesParams,
  UpdateRegistrationCodePayload,
} from './types'

export async function getRegistrationCodes(
  params: GetRegistrationCodesParams = {}
): Promise<GetRegistrationCodesResponse> {
  const { p = 1, page_size = 10 } = params
  const res = await api.get(`/api/registration_code/?p=${p}&page_size=${page_size}`)
  return res.data
}

export async function searchRegistrationCodes(
  params: SearchRegistrationCodesParams = {}
): Promise<GetRegistrationCodesResponse> {
  const { keyword = '', p = 1, page_size = 10 } = params
  const res = await api.get(
    `/api/registration_code/search?keyword=${encodeURIComponent(keyword)}&p=${p}&page_size=${page_size}`
  )
  return res.data
}

export async function getRegistrationCode(id: number): Promise<{ success: boolean; data: RegistrationCode }> {
  const res = await api.get(`/api/registration_code/${id}`)
  return res.data
}

export async function createRegistrationCode(
  payload: CreateRegistrationCodePayload
): Promise<{ success: boolean; message: string; data?: RegistrationCode[] }> {
  const res = await api.post('/api/registration_code/', payload)
  return res.data
}

export async function updateRegistrationCode(
  payload: UpdateRegistrationCodePayload,
  statusOnly = false
): Promise<{ success: boolean; message: string }> {
  const url = statusOnly ? '/api/registration_code/?status_only=true' : '/api/registration_code/'
  const res = await api.put(url, payload)
  return res.data
}

export async function deleteRegistrationCode(id: number): Promise<{ success: boolean; message: string }> {
  const res = await api.delete(`/api/registration_code/${id}/`)
  return res.data
}

export async function deleteInvalidRegistrationCodes(): Promise<{ success: boolean; message: string }> {
  const res = await api.delete('/api/registration_code/invalid')
  return res.data
}
