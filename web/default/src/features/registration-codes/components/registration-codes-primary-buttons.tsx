import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { deleteInvalidRegistrationCodes } from '../api'
import { useRegistrationCodesContext } from './registration-codes-provider'

export function RegistrationCodesPrimaryButtons() {
  const { t } = useTranslation()
  const { setOpen, triggerRefresh } = useRegistrationCodesContext()

  const handleDeleteInvalid = async () => {
    if (!confirm(t('Are you sure you want to delete all invalid (expired/used/disabled) codes?'))) {
      return
    }

    try {
      const result = await deleteInvalidRegistrationCodes()
      if (result.success) {
        toast.success(result.message || t('Invalid codes deleted successfully'))
        triggerRefresh()
      } else {
        toast.error(result.message || t('Failed to delete invalid codes'))
      }
    } catch (error) {
      toast.error(t('Failed to delete invalid codes'))
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={() => setOpen('create')} size="sm">
        <Plus className="mr-2 h-4 w-4" />
        {t('Create')}
      </Button>
      <Button onClick={handleDeleteInvalid} variant="outline" size="sm">
        <Trash2 className="mr-2 h-4 w-4" />
        {t('Delete Invalid')}
      </Button>
    </div>
  )
}
