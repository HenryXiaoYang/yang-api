import type { RiskType } from './types'

export const RISK_TYPES: Record<
  string,
  { value: RiskType; label: string; variant: 'default' | 'destructive' | 'secondary' }
> = {
  IP_RAPID_SWITCH: {
    value: 'IP_RAPID_SWITCH',
    label: 'Rapid Switch',
    variant: 'destructive',
  },
  IP_HOPPING: {
    value: 'IP_HOPPING',
    label: 'IP Hopping',
    variant: 'destructive',
  },
}

export const USER_STATUS = {
  ENABLED: 1,
  DISABLED: 2,
}
