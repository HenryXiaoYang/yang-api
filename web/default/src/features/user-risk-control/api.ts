import { api } from '@/lib/api'
import type {
  RiskControlListResponse,
  IPLogsResponse,
  DeleteResponse,
  RiskType,
} from './types'

export async function getRiskControlUsers(params: {
  page: number
  page_size: number
  keyword?: string
  risk_type?: RiskType
}) {
  const res = await api.get<RiskControlListResponse>('/api/user/risk-control', {
    params: {
      p: params.page,
      page_size: params.page_size,
      keyword: params.keyword || '',
      risk_type: params.risk_type || '',
    },
  })
  return res.data
}

export async function getUserIPLogs(userId: number) {
  const res = await api.get<IPLogsResponse>(
    `/api/user/risk-control/${userId}/ip-logs`
  )
  return res.data
}

export async function deleteRiskRecords(userIds: number[]) {
  const res = await api.delete<DeleteResponse>('/api/user/risk-control', {
    data: { ids: userIds },
  })
  return res.data
}

export async function deleteAllIPLogs() {
  const res = await api.delete<DeleteResponse>('/api/user/risk-control/ip-logs')
  return res.data
}

export async function unbanAllUsers() {
  const res = await api.post<DeleteResponse>('/api/user/risk-control/unban-all')
  return res.data
}

export async function manageUser(userId: number, action: 'enable' | 'disable') {
  const res = await api.post<DeleteResponse>('/api/user/manage', {
    id: userId,
    action: action === 'enable' ? 1 : 2,
  })
  return res.data
}
