import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { SectionPageLayout } from '@/components/layout/components/section-page-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { RankingTable } from './components/ranking-table'
import { getRankings } from './api'
import { RANKING_TYPES, DEFAULT_RANKING_TYPE } from './constants'
import type { RankingType } from './types'

export function UserRankings() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<RankingType>(DEFAULT_RANKING_TYPE)

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-rankings'],
    queryFn: getRankings,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })

  const renderTabContent = (type: RankingType) => {
    if (isLoading) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {t('Loading...')}
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-center py-8 text-destructive">
          {t('Failed to load ranking data')}
        </div>
      )
    }

    if (!data?.success || !data.data) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {t('No data available')}
        </div>
      )
    }

    const rankingData = {
      user_call: data.data.user_call_ranking,
      ip_call: data.data.ip_call_ranking,
      user_token: data.data.user_token_ranking,
      user_ip_count: data.data.user_ip_count_ranking,
      user_minute_ip: data.data.user_minute_ip_ranking,
      user_quota: data.data.user_quota_ranking,
    }

    return <RankingTable type={type} data={rankingData[type]} />
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('User Rankings')}</SectionPageLayout.Title>
      <SectionPageLayout.Description>
        {t('View top users and IPs by various metrics. Data is cached for 5 minutes.')}
      </SectionPageLayout.Description>
      <SectionPageLayout.Content>
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RankingType)}>
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                {Object.values(RANKING_TYPES).map((ranking) => (
                  <TabsTrigger key={ranking.key} value={ranking.key}>
                    {t(ranking.labelKey)}
                  </TabsTrigger>
                ))}
              </TabsList>
              {Object.values(RANKING_TYPES).map((ranking) => (
                <TabsContent key={ranking.key} value={ranking.key} className="mt-6">
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">
                      {t(ranking.descriptionKey)}
                    </p>
                  </div>
                  {renderTabContent(ranking.key)}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
