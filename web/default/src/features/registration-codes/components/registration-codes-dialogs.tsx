import { RegistrationCodesDeleteDialog } from './registration-codes-delete-dialog'
import { RegistrationCodesMutateDrawer } from './registration-codes-mutate-drawer'

export function RegistrationCodesDialogs() {
  return (
    <>
      <RegistrationCodesMutateDrawer />
      <RegistrationCodesDeleteDialog />
    </>
  )
}
