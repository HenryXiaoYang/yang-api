export interface UserCallRanking {
  username: string
  display_name: string
  ip: string
  ip_count: number
  count: number
}

export interface IPCallRanking {
  ip: string
  username: string
  display_name: string
  user_count: number
  count: number
}

export interface UserTokenRanking {
  username: string
  display_name: string
  tokens: number
  count: number
  quota: number
}

export interface UserIPCountRanking {
  username: string
  display_name: string
  ip: string
  ip_count: number
  count: number
  tokens: number
  quota: number
}

export interface UserMinuteIPRanking {
  username: string
  display_name: string
  max_ip_count: number
  minute_time: number
  ip: string
}

export interface UserQuotaRanking {
  username: string
  display_name: string
  quota: number
  used_quota: number
}

export interface RankingData {
  user_call_ranking: UserCallRanking[]
  ip_call_ranking: IPCallRanking[]
  user_token_ranking: UserTokenRanking[]
  user_ip_count_ranking: UserIPCountRanking[]
  user_minute_ip_ranking: UserMinuteIPRanking[]
  user_quota_ranking: UserQuotaRanking[]
}

export interface RankingResponse {
  success: boolean
  message: string
  data: RankingData
}

export type RankingType =
  | 'user_call'
  | 'ip_call'
  | 'user_token'
  | 'user_ip_count'
  | 'user_minute_ip'
  | 'user_quota'
