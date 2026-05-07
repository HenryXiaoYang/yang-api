export interface RiskControlUser {
  id: number
  username: string
  display_name: string
  linux_do_id: string
  email: string
  group: string
  status: number
  role: number
  remark: string
  deleted: boolean
  rapid_switch_count: number
  avg_ip_duration: number
  real_switch_count: number
  ip_risk_tags: string[]
  ip_list: string[]
}

export interface IPAccessLog {
  ip: string
  first_seen: number
  last_seen: number
}

export interface RiskControlListResponse {
  success: boolean
  message: string
  data: {
    items: RiskControlUser[]
    total: number
    page: number
    page_size: number
  }
}

export interface IPLogsResponse {
  success: boolean
  message: string
  data: IPAccessLog[]
}

export interface DeleteResponse {
  success: boolean
  message: string
}

export type RiskType = 'IP_RAPID_SWITCH' | 'IP_HOPPING' | ''
