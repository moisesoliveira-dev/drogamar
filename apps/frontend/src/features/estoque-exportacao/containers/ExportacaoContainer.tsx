import { useEffect, useMemo, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ExportacaoPage } from '../components/ExportacaoPage'
import {
  cancelExportAction,
  createExportAction,
  getExportAction,
  listExportsAction,
  loadExportLookupsAction,
  loadExportMetaAction,
  previewExportAction,
  retryExportAction,
} from '../application/exportacao.actions'
import { useExportPermissions } from '../application/use-export-permissions'
import { mapExportErrorMessage } from '../domain/errors'
import type {
  ExportDraftFilters,
  ExportFormat,
  ExportJob,
  ExportType,
} from '../domain/export.schema'
import { exportDownloadUrl } from '../infrastructure/exportacao.api'
import { useExportacaoStore } from '../stores/exportacao.store'

function cleanFilters(filters: ExportDraftFilters): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  Object.entries(filters).forEach(([key, value]) => {
    if (value === '' || value == null) return
    out[key] = value
  })
  return out
}

export function ExportacaoContainer() {
  const permissions = useExportPermissions()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const presetApplied = useRef(false)

  const draft = useExportacaoStore((s) => s.draft)
  const historyPage = useExportacaoStore((s) => s.historyPage)
  const activeJobId = useExportacaoStore((s) => s.activeJobId)
  const setType = useExportacaoStore((s) => s.setType)
  const setFormat = useExportacaoStore((s) => s.setFormat)
  const setFilter = useExportacaoStore((s) => s.setFilter)
  const setColumns = useExportacaoStore((s) => s.setColumns)
  const toggleColumn = useExportacaoStore((s) => s.toggleColumn)
  const selectAllColumns = useExportacaoStore((s) => s.selectAllColumns)
  const clearColumns = useExportacaoStore((s) => s.clearColumns)
  const setSortBy = useExportacaoStore((s) => s.setSortBy)
  const setSortDir = useExportacaoStore((s) => s.setSortDir)
  const setFileName = useExportacaoStore((s) => s.setFileName)
  const applyPreset = useExportacaoStore((s) => s.applyPreset)
  const setHistoryPage = useExportacaoStore((s) => s.setHistoryPage)
  const setActiveJobId = useExportacaoStore((s) => s.setActiveJobId)

  const metaQuery = useQuery({
    queryKey: ['estoque-exportacao', 'meta'],
    queryFn: loadExportMetaAction,
  })

  const lookupsQuery = useQuery({
    queryKey: ['estoque-lookups'],
    queryFn: loadExportLookupsAction,
    staleTime: 60_000,
  })

  const historyQuery = useQuery({
    queryKey: ['estoque-exportacao', 'history', historyPage],
    queryFn: () => listExportsAction(historyPage, 10),
  })

  const typeMeta = useMemo(() => {
    return metaQuery.data?.types.find((t) => t.type === draft.type) ?? null
  }, [metaQuery.data, draft.type])

  useEffect(() => {
    if (!typeMeta) return
    if (draft.columns.length === 0) {
      setColumns(
        typeMeta.columns.filter((c) => c.defaultSelected).map((c) => c.id),
      )
    }
    if (!typeMeta.formats.includes(draft.format)) {
      setFormat(typeMeta.formats[0] ?? 'XLSX')
    }
    if (!typeMeta.sortOptions.some((o) => o.id === draft.sortBy)) {
      setSortBy(typeMeta.defaultSortBy)
      setSortDir(typeMeta.defaultSortDir)
    }
  }, [typeMeta, draft.columns.length, draft.format, draft.sortBy, setColumns, setFormat, setSortBy, setSortDir])

  useEffect(() => {
    if (presetApplied.current || !metaQuery.data) return
    const state = location.state as
      | {
          type?: ExportType
          format?: ExportFormat
          filters?: ExportDraftFilters
          sortBy?: string
          sortDir?: 'asc' | 'desc'
        }
      | null
    const typeParam = (searchParams.get('type') as ExportType | null) ?? state?.type
    if (!typeParam) return
    const meta = metaQuery.data.types.find((t) => t.type === typeParam)
    if (!meta) return
    presetApplied.current = true
    applyPreset({
      type: typeParam,
      format: state?.format ?? meta.formats[0] ?? 'XLSX',
      filters: state?.filters ?? {},
      columns: meta.columns.filter((c) => c.defaultSelected).map((c) => c.id),
      sortBy: state?.sortBy ?? meta.defaultSortBy,
      sortDir: state?.sortDir ?? meta.defaultSortDir,
      fileName: '',
    })
    navigate(location.pathname, { replace: true, state: null })
  }, [metaQuery.data, searchParams, location, applyPreset, navigate])

  const previewQuery = useQuery({
    queryKey: [
      'estoque-exportacao',
      'preview',
      draft.type,
      draft.filters,
      draft.sortBy,
      draft.sortDir,
    ],
    queryFn: () =>
      previewExportAction({
        type: draft.type,
        filters: cleanFilters(draft.filters),
        sortBy: draft.sortBy,
        sortDir: draft.sortDir,
      }),
    enabled: Boolean(typeMeta),
  })

  const activeJobQuery = useQuery({
    queryKey: ['estoque-exportacao', 'job', activeJobId],
    queryFn: () => getExportAction(activeJobId!),
    enabled: Boolean(activeJobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'PENDING' || status === 'PROCESSING') return 2000
      return false
    },
  })

  const createMutation = useMutation({
    mutationFn: createExportAction,
    onSuccess: (job) => {
      setActiveJobId(job.id)
      void queryClient.invalidateQueries({
        queryKey: ['estoque-exportacao', 'history'],
      })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: cancelExportAction,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['estoque-exportacao'],
      })
    },
  })

  const retryMutation = useMutation({
    mutationFn: retryExportAction,
    onSuccess: (job) => {
      setActiveJobId(job.id)
      void queryClient.invalidateQueries({
        queryKey: ['estoque-exportacao', 'history'],
      })
    },
  })

  const error =
    createMutation.error ||
    cancelMutation.error ||
    retryMutation.error ||
    metaQuery.error ||
    historyQuery.error
      ? mapExportErrorMessage(
          createMutation.error ??
            cancelMutation.error ??
            retryMutation.error ??
            metaQuery.error ??
            historyQuery.error,
        )
      : null

  function handleTypeChange(type: ExportType) {
    const meta = metaQuery.data?.types.find((t) => t.type === type)
    setType(type, {
      format: meta?.formats[0] ?? 'XLSX',
      filters: type === 'LOTS_EXPIRY' ? { status: 'ATTENTION' } : {},
      columns: meta?.columns.filter((c) => c.defaultSelected).map((c) => c.id) ?? [],
      sortBy: meta?.defaultSortBy ?? 'description',
      sortDir: meta?.defaultSortDir ?? 'asc',
      fileName: '',
    })
  }

  function handleDownload(job: ExportJob) {
    window.open(exportDownloadUrl(job.id), '_blank', 'noopener,noreferrer')
  }

  function handleReuse(job: ExportJob) {
    applyPreset({
      type: job.type,
      format: job.format,
      filters: job.filters as ExportDraftFilters,
      columns: job.columns,
      sortBy: job.sortBy,
      sortDir: job.sortDir === 'desc' ? 'desc' : 'asc',
      fileName: '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleCancel(job: ExportJob) {
    if (job.status === 'PROCESSING') {
      const ok = window.confirm(
        'A exportação já está em processamento. Deseja cancelar mesmo assim?',
      )
      if (!ok) return
    }
    await cancelMutation.mutateAsync(job.id)
  }

  return (
    <ExportacaoPage
      meta={metaQuery.data ?? null}
      lookups={lookupsQuery.data ?? null}
      draft={draft}
      typeMeta={typeMeta}
      preview={previewQuery.data ?? null}
      previewLoading={previewQuery.isFetching}
      creating={createMutation.isPending}
      history={historyQuery.data?.items ?? []}
      historyTotal={historyQuery.data?.total ?? 0}
      historyPage={historyQuery.data?.page ?? historyPage}
      historyPageSize={historyQuery.data?.pageSize ?? 10}
      historyTotalPages={historyQuery.data?.totalPages ?? 1}
      historyLoading={historyQuery.isLoading}
      activeJob={activeJobQuery.data ?? null}
      error={error}
      canCreate={permissions.canCreate}
      canDownload={permissions.canDownload}
      canCancel={permissions.canCancel}
      onRefreshHistory={() => {
        void queryClient.invalidateQueries({
          queryKey: ['estoque-exportacao', 'history'],
        })
      }}
      onTypeChange={handleTypeChange}
      onFormatChange={setFormat}
      onFilterChange={setFilter}
      onToggleColumn={toggleColumn}
      onSelectAllColumns={() =>
        selectAllColumns(typeMeta?.columns.map((c) => c.id) ?? [])
      }
      onClearColumns={clearColumns}
      onSortByChange={setSortBy}
      onSortDirChange={setSortDir}
      onFileNameChange={setFileName}
      onGenerate={() => {
        createMutation.mutate({
          type: draft.type,
          format: draft.format,
          filters: cleanFilters(draft.filters),
          columns: draft.columns,
          sortBy: draft.sortBy,
          sortDir: draft.sortDir,
          fileName: draft.fileName || undefined,
        })
      }}
      onHistoryPageChange={setHistoryPage}
      onDownload={handleDownload}
      onRefreshJob={(job) => {
        void queryClient.invalidateQueries({
          queryKey: ['estoque-exportacao', 'job', job.id],
        })
        void queryClient.invalidateQueries({
          queryKey: ['estoque-exportacao', 'history'],
        })
      }}
      onCancelJob={(job) => {
        void handleCancel(job)
      }}
      onRetryJob={(job) => {
        retryMutation.mutate(job.id)
      }}
      onReuseConfig={handleReuse}
    />
  )
}
