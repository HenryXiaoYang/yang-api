import { useTranslation } from 'react-i18next'
import { SectionPageLayout } from '@/components/layout/components/section-page-layout'
import { RegistrationCodesDialogs } from './components/registration-codes-dialogs'
import { RegistrationCodesPrimaryButtons } from './components/registration-codes-primary-buttons'
import { RegistrationCodesProvider } from './components/registration-codes-provider'
import { RegistrationCodesTable } from './components/registration-codes-table'

export function RegistrationCodes() {
  const { t } = useTranslation()

  return (
    <RegistrationCodesProvider>
      <SectionPageLayout>
        <SectionPageLayout.Title>{t('Registration Codes')}</SectionPageLayout.Title>
        <SectionPageLayout.Description>
          {t('Manage registration codes for user sign-up. Create, edit, and monitor code usage.')}
        </SectionPageLayout.Description>
        <SectionPageLayout.Actions>
          <RegistrationCodesPrimaryButtons />
        </SectionPageLayout.Actions>
        <SectionPageLayout.Content>
          <RegistrationCodesTable />
        </SectionPageLayout.Content>
      </SectionPageLayout>
      <RegistrationCodesDialogs />
    </RegistrationCodesProvider>
  )
}
