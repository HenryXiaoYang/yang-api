import { createFileRoute } from '@tanstack/react-router'
import { UserRankings } from '@/features/user-rankings'

export const Route = createFileRoute('/_authenticated/user-rankings/')({
  component: UserRankings,
})
