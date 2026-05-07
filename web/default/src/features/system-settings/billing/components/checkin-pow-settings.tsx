import { z } from 'zod'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
import { useUpdateOption } from '../../hooks/use-update-option'

const schema = z.object({
  // Check-in settings
  'checkin_setting.enabled': z.boolean(),
  'checkin_setting.min_quota': z.coerce.number().int().min(0),
  'checkin_setting.max_quota': z.coerce.number().int().min(0),
  // PoW settings
  'pow_setting.enabled': z.boolean(),
  'pow_setting.mode': z.enum(['replace', 'supplement', 'fallback']),
  'pow_setting.difficulty': z.coerce.number().min(1).max(32),
  'pow_setting.challenge_ttl': z.coerce.number().min(1).max(3600),
})

type Values = z.infer<typeof schema>

export function CheckinPowSettings({
  defaultValues,
}: {
  defaultValues: Values
}) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()

  const form = useForm<Values>({
    resolver: zodResolver(schema) as unknown as Resolver<Values>,
    defaultValues,
  })

  const { isDirty, isSubmitting } = form.formState
  const checkinEnabled = form.watch('checkin_setting.enabled')
  const powEnabled = form.watch('pow_setting.enabled')

  async function onSubmit(values: Values) {
    const updates: Array<{ key: string; value: string | number | boolean }> = []

    // Check for changes
    Object.keys(values).forEach((key) => {
      const typedKey = key as keyof Values
      if (values[typedKey] !== defaultValues[typedKey]) {
        updates.push({
          key,
          value: values[typedKey],
        })
      }
    })

    if (updates.length === 0) {
      toast.info(t('No changes to save'))
      return
    }

    for (const update of updates) {
      await updateOption.mutateAsync(update)
    }

    form.reset(values)
  }

  return (
    <SettingsSection
      title={t('Check-in & Anti-Bot')}
      description={t('Configure daily check-in rewards and proof-of-work challenges')}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          autoComplete='off'
          className='space-y-8'
        >
          {/* Check-in Settings */}
          <div className='space-y-6'>
            <div>
              <h3 className='text-lg font-medium'>{t('Check-in Rewards')}</h3>
              <p className='text-sm text-muted-foreground'>
                {t('Configure daily check-in rewards for users')}
              </p>
            </div>

            <FormField
              control={form.control}
              name='checkin_setting.enabled'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>
                      {t('Enable check-in feature')}
                    </FormLabel>
                    <FormDescription>
                      {t(
                        'Allow users to check in daily for random quota rewards'
                      )}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={updateOption.isPending || isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {checkinEnabled && (
              <div className='grid gap-6 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='checkin_setting.min_quota'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Minimum check-in quota')}</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          placeholder={t('1000')}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('Minimum quota amount awarded for check-in')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='checkin_setting.max_quota'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Maximum check-in quota')}</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          placeholder={t('10000')}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('Maximum quota amount awarded for check-in')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* PoW Settings */}
          <div className='space-y-6 border-t pt-6'>
            <div>
              <h3 className='text-lg font-medium'>{t('Proof of Work')}</h3>
              <p className='text-sm text-muted-foreground'>
                {t('Configure anti-bot proof-of-work challenges')}
              </p>
            </div>

            <FormField
              control={form.control}
              name='pow_setting.enabled'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>
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
                      disabled={updateOption.isPending || isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {powEnabled && (
              <div className='space-y-6'>
                <FormField
                  control={form.control}
                  name='pow_setting.mode'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('PoW Mode')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={updateOption.isPending || isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('Select mode')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='replace'>
                            {t('Replace')} - {t('Replace Turnstile with PoW')}
                          </SelectItem>
                          <SelectItem value='supplement'>
                            {t('Supplement')} - {t('Require both Turnstile and PoW')}
                          </SelectItem>
                          <SelectItem value='fallback'>
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

                <div className='grid gap-6 sm:grid-cols-2'>
                  <FormField
                    control={form.control}
                    name='pow_setting.difficulty'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Difficulty Level')}</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={1}
                            max={32}
                            {...field}
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
                    name='pow_setting.challenge_ttl'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Challenge TTL (seconds)')}</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={1}
                            max={3600}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('How long a challenge remains valid before expiring')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
          </div>

          <Button
            type='submit'
            disabled={!isDirty || updateOption.isPending || isSubmitting}
          >
            {updateOption.isPending || isSubmitting
              ? t('Saving...')
              : t('Save Changes')}
          </Button>
        </form>
      </Form>
    </SettingsSection>
  )
}
