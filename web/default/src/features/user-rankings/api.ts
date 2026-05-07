import { api } from '@/lib/api'
import type { RankingResponse } from './types'

export async function getRankings() {
  const res = await api.get<RankingResponse>('/api/log/ranking')
  return res.data
}
