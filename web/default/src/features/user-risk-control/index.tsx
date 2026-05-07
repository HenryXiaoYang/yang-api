import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionPageLayout } from '@/components/layout/components/section-page-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Trash2, ShieldOff } from 'lucide-react'
import { toast } from 'sonner'
import { RiskControlTable } from './components/risk-control-table'
import { getRiskControlUsers, deleteAllIPLogs, unbanAllUsers } from './api'
import type { RiskType } from './types'
import { RISK_TYPES } from './constants'

const PAGE_SIZE = 20

export function UserRiskControl() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [riskType, setRiskType] = useState<RiskType>('')
  const [searchInput, setSearchInput] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'delete-logs' | 'unban-all' | null
  }>({
    open: false,
    type: null,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['risk-control-users', page, keyword, riskType],
    queryFn: () =>
      getRiskControlUsers({
        page,
        page_size: PAGE_SIZE,
        keyword,
        risk_type: riskType,
      }),
  })

  const deleteLogsMutation = useMutation({
    mutationFn: deleteAllIPLogs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-control-users'] })
      toast.success(t('All IP logs deleted successfully'))
      setConfirmDialog({ open: false, type: null })
    },
    onError: () => {
      toast.error(t('Failed to delete IP logs'))
    },
  })

  const unbanAllMutation = useMutation({
    mutationFn: unbanAllUsers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-control-users'] })
      toast.success(t('All users unbanned successfully'))
      setConfirmDialog({ open: false, type: null })
    },
    onError: () => {
      toast.error(t('Failed to unban users'))
    },
  })

  const handleSearch = () => {
    setKeyword(searchInput)
    setPage(1)
  }

  const handleRiskTypeChange = (value: string) => {
    setRiskType(value as RiskType)
    setPage(1)
  }

  const handleConfirmAction = () => {
    if (confirmDialog.type === 'delete-logs') {
      deleteLogsMutation.mutate()
    } else if (confirmDialog.type === 'unban-all') {
      unbanAllMutation.mutate()
    }
  }

  const totalPages = data?.data ? Math.ceil(data.data.total / PAGE_SIZE) : 0

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('User Risk Control')}</SectionPageLayout.Title>
      <SectionPageLayout.Description>
        {t('Monitor and manage users with suspicious IP switching patterns')}
      </SectionPageLayout.Description>
      <SectionPageLayout.Content>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex gap-2">
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder={t('Search by username or email')}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch}>
                    <Search className="h-4 w-4 mr-2" />
                    {t('Search')}
                  </Button>
                </div>
                <Select value={riskType} onValueChange={handleRiskTypeChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t('All Risk Types')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('All Risk Types')}</SelectItem>
                    {Object.values(RISK_TYPES).map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {t(type.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => setConfirmDialog({ open: true, type: 'delete-logs' })}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('Clear All IP Logs')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmDialog({ open: true, type: 'unban-all' })}
                >
                  <ShieldOff className="h-4 w-4 mr-2" />
                  {t('Unban All Users')}
                </Button>
              </div>
            </div>

            <RiskControlTable
              data={data?.data?.items || []}
              isLoading={isLoading}
            />

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  {t('Page')} {page} {t('of')} {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    {t('Previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    {t('Next')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </SectionPageLayout.Content>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, type: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === 'delete-logs'
                ? t('Clear All IP Logs')
                : t('Unban All Users')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === 'delete-logs'
                ? t('This will permanently delete all IP access logs. This action cannot be undone.')
                : t('This will enable all disabled users. Are you sure?')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {t('Confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionPageLayout>
  )
}
