import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Ban, CheckCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { RiskControlUser } from '../types'
import { manageUser, deleteRiskRecords } from '../api'
import { RISK_TYPES, USER_STATUS } from '../constants'
import { IPLogsDialog } from './ip-logs-dialog'

interface RiskControlTableProps {
  data: RiskControlUser[]
  isLoading: boolean
}

export function RiskControlTable({ data, isLoading }: RiskControlTableProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [ipLogsDialog, setIPLogsDialog] = useState<{
    open: boolean
    userId: number | null
    username: string
  }>({
    open: false,
    userId: null,
    username: '',
  })

  const manageUserMutation = useMutation({
    mutationFn: ({ userId, action }: { userId: number; action: 'enable' | 'disable' }) =>
      manageUser(userId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-control-users'] })
      toast.success(t('User status updated successfully'))
    },
    onError: () => {
      toast.error(t('Failed to update user status'))
    },
  })

  const deleteRecordsMutation = useMutation({
    mutationFn: (userIds: number[]) => deleteRiskRecords(userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-control-users'] })
      toast.success(t('Risk records deleted successfully'))
    },
    onError: () => {
      toast.error(t('Failed to delete risk records'))
    },
  })

  const columns: ColumnDef<RiskControlUser>[] = [
    {
      accessorKey: 'id',
      header: t('ID'),
      cell: ({ row }) => <div className="w-16">{row.original.id}</div>,
    },
    {
      accessorKey: 'username',
      header: t('Username'),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.display_name || row.original.username}</div>
          <div className="text-xs text-muted-foreground">{row.original.username}</div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: t('Status'),
      cell: ({ row }) => (
        <Badge variant={row.original.status === USER_STATUS.ENABLED ? 'default' : 'secondary'}>
          {row.original.status === USER_STATUS.ENABLED ? t('Enabled') : t('Disabled')}
        </Badge>
      ),
    },
    {
      accessorKey: 'ip_risk_tags',
      header: t('Risk Tags'),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.ip_risk_tags?.map((tag, idx) => {
            const riskType = RISK_TYPES[tag]
            return riskType ? (
              <Badge key={idx} variant={riskType.variant}>
                {t(riskType.label)}
              </Badge>
            ) : null
          })}
        </div>
      ),
    },
    {
      accessorKey: 'rapid_switch_count',
      header: t('Rapid Switch Count'),
      cell: ({ row }) => row.original.rapid_switch_count,
    },
    {
      accessorKey: 'real_switch_count',
      header: t('Real Switch Count'),
      cell: ({ row }) => row.original.real_switch_count,
    },
    {
      accessorKey: 'avg_ip_duration',
      header: t('Avg IP Duration (s)'),
      cell: ({ row }) => row.original.avg_ip_duration.toFixed(2),
    },
    {
      accessorKey: 'ip_list',
      header: t('IPs'),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {row.original.ip_list?.slice(0, 2).map((ip, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {ip}
            </Badge>
          ))}
          {row.original.ip_list?.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{row.original.ip_list.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                setIPLogsDialog({
                  open: true,
                  userId: row.original.id,
                  username: row.original.display_name || row.original.username,
                })
              }
            >
              <Eye className="mr-2 h-4 w-4" />
              {t('View IP Logs')}
            </DropdownMenuItem>
            {row.original.status === USER_STATUS.ENABLED ? (
              <DropdownMenuItem
                onClick={() =>
                  manageUserMutation.mutate({ userId: row.original.id, action: 'disable' })
                }
              >
                <Ban className="mr-2 h-4 w-4" />
                {t('Disable User')}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() =>
                  manageUserMutation.mutate({ userId: row.original.id, action: 'enable' })
                }
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {t('Enable User')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => deleteRecordsMutation.mutate([row.original.id])}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('Delete Risk Records')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('Loading...')}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('No users with risk indicators found')}
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <IPLogsDialog
        userId={ipLogsDialog.userId}
        username={ipLogsDialog.username}
        open={ipLogsDialog.open}
        onOpenChange={(open) =>
          setIPLogsDialog((prev) => ({ ...prev, open }))
        }
      />
    </>
  )
}
