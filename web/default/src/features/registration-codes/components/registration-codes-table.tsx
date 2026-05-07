import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { DataTablePage } from '@/components/data-table/data-table-page'
import { searchRegistrationCodes } from '../api'
import { DEFAULT_PAGE_SIZE } from '../constants'
import { useRegistrationCodesColumns } from './registration-codes-columns'
import { useRegistrationCodesContext } from './registration-codes-provider'

export function RegistrationCodesTable() {
  const { refreshTrigger } = useRegistrationCodesContext()
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['registration-codes', pagination.pageIndex + 1, pagination.pageSize, globalFilter, refreshTrigger],
    queryFn: () =>
      searchRegistrationCodes({
        keyword: globalFilter,
        p: pagination.pageIndex + 1,
        page_size: pagination.pageSize,
      }),
  })

  const columns = useRegistrationCodesColumns()

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    pageCount: data?.total ? Math.ceil(data.total / pagination.pageSize) : -1,
    state: {
      sorting,
      pagination,
      globalFilter,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  })

  return (
    <DataTablePage
      table={table}
      columns={columns}
      isLoading={isLoading}
      isFetching={isFetching}
    />
  )
}
