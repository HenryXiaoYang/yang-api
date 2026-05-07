import React, { createContext, useContext, useState } from 'react'
import type { RegistrationCode, RegistrationCodesDialogType } from '../types'

interface RegistrationCodesContextType {
  open: RegistrationCodesDialogType
  setOpen: (type: RegistrationCodesDialogType) => void
  currentRow: RegistrationCode | null
  setCurrentRow: React.Dispatch<React.SetStateAction<RegistrationCode | null>>
  refreshTrigger: number
  triggerRefresh: () => void
}

const RegistrationCodesContext = createContext<RegistrationCodesContextType | undefined>(undefined)

export function RegistrationCodesProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<RegistrationCodesDialogType>(null)
  const [currentRow, setCurrentRow] = useState<RegistrationCode | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1)

  return (
    <RegistrationCodesContext.Provider
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
        refreshTrigger,
        triggerRefresh,
      }}
    >
      {children}
    </RegistrationCodesContext.Provider>
  )
}

export function useRegistrationCodesContext() {
  const context = useContext(RegistrationCodesContext)
  if (!context) {
    throw new Error('useRegistrationCodesContext must be used within RegistrationCodesProvider')
  }
  return context
}
