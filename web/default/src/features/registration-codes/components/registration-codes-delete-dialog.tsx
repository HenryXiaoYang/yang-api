import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
import { deleteRegistrationCode } from '../api'
import { useRegistrationCodesContext } from './registration-codes-provider'

export function RegistrationCodesDeleteDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow, triggerRefresh } = useRegistrationCodesContext()

  const isOpen = open === 'delete'

  const handleDelete = async () => {
    if (!currentRow) return

    try {
      const result = await deleteRegistrationCode(currentRow.id)

      if (result.success) {
        toast.success(result.message || t('Registration code deleted successfully'))
        setOpen(null)
        triggerRefresh()
      } else {
        toast.error(result.message || t('Failed to delete registration code'))
      }
    } catch (error) {
      toast.error(t('An error occurred'))
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && setOpen(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('Delete Registration Code')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('Are you sure you want to delete this registration code?')}
            {currentRow && (
              <div className="mt-2 p-2 bg-muted rounded-md">
                <div className="text-sm">
                  <strong>{t('Name')}:</strong> {currentRow.name}
                </div>
                <div className="text-sm font-mono">
                  <strong>{t('Code')}:</strong> {currentRow.code}
                </div>
              </div>
            )}
            <div className="mt-2 text-destructive">
              {t('This action cannot be undone.')}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {t('Delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
