import type { Row } from '@tanstack/react-table'
import { Copy, Edit, Eye, MoreHorizontal, Power, PowerOff, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { updateRegistrationCode } from '../api'
import { REGISTRATION_CODE_STATUS } from '../constants'
import { copyToClipboard, isCodeActive } from '../lib/utils'
import type { RegistrationCode } from '../types'
import { useRegistrationCodesContext } from './registration-codes-provider'

interface DataTableRowActionsProps {
  row: Row<RegistrationCode>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { t } = useTranslation()
  const { setOpen, setCurrentRow, triggerRefresh } = useRegistrationCodesContext()
  const code = row.original

  const handleCopy = async () => {
    try {
      await copyToClipboard(code.code)
      toast.success(t('Code copied to clipboard'))
    } catch (error) {
      toast.error(t('Failed to copy code'))
    }
  }

  const handleEdit = () => {
    setCurrentRow(code)
    setOpen('edit')
  }

  const handleDelete = () => {
    setCurrentRow(code)
    setOpen('delete')
  }

  const handleToggleStatus = async () => {
    const newStatus =
      code.status === REGISTRATION_CODE_STATUS.ACTIVE
        ? REGISTRATION_CODE_STATUS.DISABLED
        : REGISTRATION_CODE_STATUS.ACTIVE

    try {
      const result = await updateRegistrationCode(
        {
          id: code.id,
          status: newStatus,
        },
        true
      )

      if (result.success) {
        toast.success(result.message || t('Status updated successfully'))
        triggerRefresh()
      } else {
        toast.error(result.message || t('Failed to update status'))
      }
    } catch (error) {
      toast.error(t('Failed to update status'))
    }
  }

  const canEdit = isCodeActive(code)
  const isActive = code.status === REGISTRATION_CODE_STATUS.ACTIVE

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">{t('Open menu')}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" />
          {t('Copy Code')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleEdit}
          disabled={!canEdit}
        >
          <Edit className="mr-2 h-4 w-4" />
          {t('Edit')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleToggleStatus}>
          {isActive ? (
            <>
              <PowerOff className="mr-2 h-4 w-4" />
              {t('Disable')}
            </>
          ) : (
            <>
              <Power className="mr-2 h-4 w-4" />
              {t('Enable')}
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          {t('Delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
