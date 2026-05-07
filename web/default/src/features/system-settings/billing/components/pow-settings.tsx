import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { SettingsSection } from '../../components/settings-section'
import { useResetForm } from '../../hooks/use-reset-form'
import { useUpdateOption } from '../../hooks/use-update-option'

const powSettingsSchema = z.object({
  'pow_setting.enabled': z.boolean(),
  'pow_setting.mode': z.enum(['replace', 'supplement', 'fallback']),
  'pow_setting.difficulty': z.coerce.number().min(1).max(32),
  'pow_setting.challenge_ttl': z.coerce.number().min(1).max(3600),
})

type PowSettingsFormData = z.infer<typeof powSettingsSchema>

interface PowSettingsProps {
  settings: PowSettingsFormData
}

export function PowSettings({ settings }: PowSettingsProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()

  const form = useForm<PowSettingsFormData>({
    resolver: zodResolver(powSettingsSchema),
    defaultValues: settings,
  })

  useResetForm(form, settings)

  const onSubmit = async (data: PowSettingsFormData) => {
    const updates = Object.entries(data).filter(
      ([key, value]) => value !== settings[key as keyof PowSettingsFormData]
    )

    for (const [key, value] of updates) {
      await updateOption.mutateAsync({ key, value })
    }
  }

  return (
    <SettingsSection
      title={t('Proof of Work')}
      description={t('Configure anti-bot proof-of-work challenges')}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="pow_setting.enabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    {t('Enable Proof of Work')}
                  </FormLabel>
                  <FormDescription>
                    {t('Require clients to solve computational challenges to prevent bot abuse')}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pow_setting.mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('PoW Mode')}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select mode')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="replace">
                      {t('Replace')} - {t('Replace Turnstile with PoW')}
                    </SelectItem>
                    <SelectItem value="supplement">
                      {t('Supplement')} - {t('Require both Turnstile and PoW')}
                    </SelectItem>
                    <SelectItem value="fallback">
                      {t('Fallback')} - {t('Use PoW if Turnstile fails')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t('How PoW interacts with existing Turnstile verification')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pow_setting.difficulty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Difficulty Level')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={32}
                    value={field.value as number}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    name={field.name}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                </FormControl>
                <FormDescription>
                  {t('Number of leading zero bits required (1-32). Higher = harder. Recommended: 18-20')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pow_setting.challenge_ttl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Challenge TTL (seconds)')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={3600}
                    value={field.value as number}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    name={field.name}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                </FormControl>
                <FormDescription>
                  {t('How long a challenge remains valid before expiring')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={updateOption.isPending || !form.formState.isDirty}
          >
            {updateOption.isPending ? t('Saving...') : t('Save Changes')}
          </Button>
        </form>
      </Form>
    </SettingsSection>
  )
}
