import type { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { formatTimestamp, getStatusLabel, getStatusVariant, isCodeExpired } from '../lib/utils'
import type { RegistrationCode } from '../types'
import { DataTableRowActions } from './data-table-row-actions'

export function useRegistrationCodesColumns(): ColumnDef<RegistrationCode>[] {
  const { t } = useTranslation()

  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t('Select all')}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t('Select row')}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'id',
      header: t('ID'),
      cell: ({ row }) => <div className="w-[60px]">{row.getValue('id')}</div>,
    },
    {
      accessorKey: 'name',
      header: t('Name'),
      cell: ({ row }) => <div className="max-w-[200px] truncate">{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'code',
      header: t('Code'),
      cell: ({ row }) => (
        <div className="font-mono text-sm max-w-[150px] truncate">{row.getValue('code')}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: t('Status'),
      cell: ({ row }) => {
        const code = row.original
        const isExpired = isCodeExpired(code)

        if (isExpired) {
          return <Badge variant="destructive">{t('Expired')}</Badge>
        }

        const status = row.getValue('status') as 1 | 2 | 3
        return (
          <Badge variant={getStatusVariant(status)}>
            {getStatusLabel(status, t)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'created_time',
      header: t('Created Time'),
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {formatTimestamp(row.getValue('created_time'), t)}
        </div>
      ),
    },
    {
      accessorKey: 'expired_time',
      header: t('Expiration Time'),
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {formatTimestamp(row.getValue('expired_time'), t)}
        </div>
      ),
    },
    {
      accessorKey: 'used_user_id',
      header: t('Used By User ID'),
      cell: ({ row }) => {
        const userId = row.getValue('used_user_id') as number
        return (
          <div className="text-sm text-muted-foreground">
            {userId === 0 ? t('Unused') : userId}
          </div>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => <DataTableRowActions row={row} />,
    },
  ]
}
