import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { createRegistrationCode, updateRegistrationCode } from '../api'
import {
  getRegistrationCodeFormSchema,
  transformFormDataToCreatePayload,
  transformFormDataToUpdatePayload,
  transformRegistrationCodeToFormDefaults,
} from '../lib/registration-code-form'
import type { RegistrationCodeFormData } from '../types'
import { useRegistrationCodesContext } from './registration-codes-provider'

export function RegistrationCodesMutateDrawer() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow, triggerRefresh } = useRegistrationCodesContext()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const form = useForm<RegistrationCodeFormData>({
    resolver: zodResolver(getRegistrationCodeFormSchema(t)),
    defaultValues: {
      name: '',
      count: 1,
      expired_time: null,
    },
  })

  useEffect(() => {
    if (isOpen) {
      if (isEdit && currentRow) {
        form.reset(transformRegistrationCodeToFormDefaults(currentRow))
      } else {
        form.reset({
          name: '',
          count: 1,
          expired_time: null,
        })
      }
    }
  }, [isOpen, isEdit, currentRow, form])

  const onSubmit = async (data: RegistrationCodeFormData) => {
    try {
      if (isEdit && currentRow) {
        const payload = transformFormDataToUpdatePayload(currentRow.id, data)
        const result = await updateRegistrationCode(payload)

        if (result.success) {
          toast.success(result.message || t('Registration code updated successfully'))
          setOpen(null)
          triggerRefresh()
        } else {
          toast.error(result.message || t('Failed to update registration code'))
        }
      } else {
        const payload = transformFormDataToCreatePayload(data)
        const result = await createRegistrationCode(payload)

        if (result.success) {
          toast.success(result.message || t('Registration codes created successfully'))

          // Offer to download codes if multiple were created
          if (result.data && result.data.length > 0) {
            const codes = result.data.map((c) => c.code)
            const download = confirm(t('Download codes as text file?'))
            if (download) {
              const content = codes.join('\n')
              const blob = new Blob([content], { type: 'text/plain' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `registration-codes-${Date.now()}.txt`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }
          }

          setOpen(null)
          triggerRefresh()
        } else {
          toast.error(result.message || t('Failed to create registration codes'))
        }
      }
    } catch (error) {
      toast.error(t('An error occurred'))
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && setOpen(null)}>
      <SheetContent className="sm:max-w-[540px]">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? t('Edit Registration Code') : t('Create Registration Codes')}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? t('Update the registration code details')
              : t('Create one or more registration codes')}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('Enter a name for the code(s)')} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('A descriptive name to identify this registration code')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEdit && (
              <FormField
                control={form.control}
                name="count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Count')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10000}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('Number of codes to generate (1-10000)')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="expired_time"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('Expiration Date')}</FormLabel>
                  <FormControl>
                    <DatePicker
                      date={field.value}
                      onDateChange={field.onChange}
                      placeholder={t('Select expiration date')}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('Leave empty for codes that never expire')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(null)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? t('Saving...')
                  : isEdit
                    ? t('Update')
                    : t('Create')}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
