import type { RankingType } from './types'

export const RANKING_TYPES: Record<
  RankingType,
  { key: RankingType; labelKey: string; descriptionKey: string }
> = {
  user_call: {
    key: 'user_call',
    labelKey: 'User Call Ranking',
    descriptionKey: 'Top users by API call count',
  },
  ip_call: {
    key: 'ip_call',
    labelKey: 'IP Call Ranking',
    descriptionKey: 'Top IPs by API call count',
  },
  user_token: {
    key: 'user_token',
    labelKey: 'Token Consumption',
    descriptionKey: 'Top users by token usage',
  },
  user_ip_count: {
    key: 'user_ip_count',
    labelKey: 'User IP Count',
    descriptionKey: 'Users with most unique IPs',
  },
  user_minute_ip: {
    key: 'user_minute_ip',
    labelKey: '1-Minute IP Count',
    descriptionKey: 'Max IPs used within 1 minute',
  },
  user_quota: {
    key: 'user_quota',
    labelKey: 'Balance Ranking',
    descriptionKey: 'Users with highest remaining balance',
  },
}

export const DEFAULT_RANKING_TYPE: RankingType = 'user_call'
