import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getUserIPLogs } from '../api'

interface IPLogsDialogProps {
  userId: number | null
  username: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
}

export function IPLogsDialog({
  userId,
  username,
  open,
  onOpenChange,
}: IPLogsDialogProps) {
  const { t } = useTranslation()

  const { data, isLoading } = useQuery({
    queryKey: ['user-ip-logs', userId],
    queryFn: () => getUserIPLogs(userId!),
    enabled: open && userId !== null,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('IP Access Logs')} - {username}
          </DialogTitle>
          <DialogDescription>
            {t('View all IP addresses used by this user')}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('Loading...')}
          </div>
        ) : !data?.success || !data.data ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('No IP logs found')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('IP Address')}</TableHead>
                <TableHead>{t('First Seen')}</TableHead>
                <TableHead>{t('Last Seen')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((log, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Badge variant="secondary">{log.ip}</Badge>
                  </TableCell>
                  <TableCell>{formatTimestamp(log.first_seen)}</TableCell>
                  <TableCell>{formatTimestamp(log.last_seen)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}
