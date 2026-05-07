import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { MedalAvatar } from './medal-avatar'
import type {
  UserCallRanking,
  IPCallRanking,
  UserTokenRanking,
  UserIPCountRanking,
  UserMinuteIPRanking,
  UserQuotaRanking,
  RankingType,
} from '../types'

interface RankingTableProps {
  type: RankingType
  data:
    | UserCallRanking[]
    | IPCallRanking[]
    | UserTokenRanking[]
    | UserIPCountRanking[]
    | UserMinuteIPRanking[]
    | UserQuotaRanking[]
}

function formatQuota(quota: number): string {
  return (quota / 500000).toFixed(2)
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
}

export function RankingTable({ type, data }: RankingTableProps) {
  const { t } = useTranslation()

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('No ranking data available')}
      </div>
    )
  }

  const renderIPList = (ipString: string) => {
    if (!ipString) return null
    const ips = ipString.split(',').filter(Boolean)
    return (
      <div className="flex flex-wrap gap-1">
        {ips.slice(0, 3).map((ip, idx) => (
          <Badge key={idx} variant="secondary" className="text-xs">
            {ip.trim()}
          </Badge>
        ))}
        {ips.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{ips.length - 3}
          </Badge>
        )}
      </div>
    )
  }

  const renderUserList = (userString: string, displayString: string) => {
    if (!userString) return null
    const users = userString.split(',').filter(Boolean)
    const displays = displayString?.split(',').filter(Boolean) || []
    return (
      <div className="flex flex-wrap gap-1">
        {users.slice(0, 3).map((user, idx) => (
          <Badge key={idx} variant="secondary" className="text-xs">
            {displays[idx]?.trim() || user.trim()}
          </Badge>
        ))}
        {users.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{users.length - 3}
          </Badge>
        )}
      </div>
    )
  }

  // User Call Ranking
  if (type === 'user_call') {
    const rankings = data as UserCallRanking[]
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">{t('Rank')}</TableHead>
            <TableHead>{t('User')}</TableHead>
            <TableHead>{t('IP Count')}</TableHead>
            <TableHead>{t('IPs')}</TableHead>
            <TableHead className="text-right">{t('Call Count')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((item, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <MedalAvatar displayName={item.display_name} rank={index + 1} />
                  <span>{item.display_name || item.username}</span>
                </div>
              </TableCell>
              <TableCell>{item.ip_count}</TableCell>
              <TableCell>{renderIPList(item.ip)}</TableCell>
              <TableCell className="text-right">{item.count.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  // IP Call Ranking
  if (type === 'ip_call') {
    const rankings = data as IPCallRanking[]
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">{t('Rank')}</TableHead>
            <TableHead>{t('IP')}</TableHead>
            <TableHead>{t('User Count')}</TableHead>
            <TableHead>{t('Users')}</TableHead>
            <TableHead className="text-right">{t('Call Count')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((item, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>
                <Badge variant="secondary">{item.ip}</Badge>
              </TableCell>
              <TableCell>{item.user_count}</TableCell>
              <TableCell>{renderUserList(item.username, item.display_name)}</TableCell>
              <TableCell className="text-right">{item.count.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  // User Token Ranking
  if (type === 'user_token') {
    const rankings = data as UserTokenRanking[]
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">{t('Rank')}</TableHead>
            <TableHead>{t('User')}</TableHead>
            <TableHead className="text-right">{t('Tokens')}</TableHead>
            <TableHead className="text-right">{t('Call Count')}</TableHead>
            <TableHead className="text-right">{t('Quota Used')}</TableHead>
            <TableHead className="text-right">{t('Avg Price/Request')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((item, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <MedalAvatar displayName={item.display_name} rank={index + 1} />
                  <span>{item.display_name || item.username}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">{item.tokens.toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.count.toLocaleString()}</TableCell>
              <TableCell className="text-right">{formatQuota(item.quota)}</TableCell>
              <TableCell className="text-right">
                {item.count > 0 ? formatQuota(item.quota / item.count) : '0.00'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  // User IP Count Ranking
  if (type === 'user_ip_count') {
    const rankings = data as UserIPCountRanking[]
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">{t('Rank')}</TableHead>
            <TableHead>{t('User')}</TableHead>
            <TableHead className="text-right">{t('IP Count')}</TableHead>
            <TableHead>{t('IPs')}</TableHead>
            <TableHead className="text-right">{t('Call Count')}</TableHead>
            <TableHead className="text-right">{t('Tokens')}</TableHead>
            <TableHead className="text-right">{t('Quota Used')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((item, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <MedalAvatar displayName={item.display_name} rank={index + 1} />
                  <span>{item.display_name || item.username}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">{item.ip_count}</TableCell>
              <TableCell>{renderIPList(item.ip)}</TableCell>
              <TableCell className="text-right">{item.count.toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.tokens.toLocaleString()}</TableCell>
              <TableCell className="text-right">{formatQuota(item.quota)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  // User Minute IP Ranking
  if (type === 'user_minute_ip') {
    const rankings = data as UserMinuteIPRanking[]
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">{t('Rank')}</TableHead>
            <TableHead>{t('User')}</TableHead>
            <TableHead className="text-right">{t('Max IP Count (1 min)')}</TableHead>
            <TableHead>{t('Time Occurred')}</TableHead>
            <TableHead>{t('IPs')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((item, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <MedalAvatar displayName={item.display_name} rank={index + 1} />
                  <span>{item.display_name || item.username}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">{item.max_ip_count}</TableCell>
              <TableCell>{formatTimestamp(item.minute_time)}</TableCell>
              <TableCell>{renderIPList(item.ip)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  // User Quota Ranking
  if (type === 'user_quota') {
    const rankings = data as UserQuotaRanking[]
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">{t('Rank')}</TableHead>
            <TableHead>{t('User')}</TableHead>
            <TableHead className="text-right">{t('Remaining Balance')}</TableHead>
            <TableHead className="text-right">{t('Used Quota')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((item, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <MedalAvatar displayName={item.display_name} rank={index + 1} />
                  <span>{item.display_name || item.username}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">{formatQuota(item.quota)}</TableCell>
              <TableCell className="text-right">{formatQuota(item.used_quota)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return null
}
