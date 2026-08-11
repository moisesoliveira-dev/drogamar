import { z } from 'zod'
import { apiFetch, HttpNetworkError, readError } from '../../../shared/lib/http'
import {
  ExportLimitClientError,
  ExportNetworkError,
  ExportPermissionClientError,
  ExportServiceError,
  ExportValidationClientError,
} from '../domain/errors'
import {
  estoqueExportConfig,
  exportHistorySchema,
  exportJobSchema,
  exportMetaSchema,
  exportPreviewSchema,
  type ExportFormat,
  type ExportHistory,
  type ExportJob,
  type ExportMeta,
  type ExportPreview,
  type ExportType,
} from '../domain/export.schema'

const lookupOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  code: z.string().optional(),
})

const stockLookupsSchema = z.object({
  categories: z.array(lookupOptionSchema),
  brands: z.array(lookupOptionSchema),
  locations: z.array(lookupOptionSchema),
  units: z.array(lookupOptionSchema),
  itemTypes: z.array(z.object({ id: z.string(), label: z.string() })),
})

export type ExportLookups = z.infer<typeof stockLookupsSchema>

async function mapError(response: Response): Promise<never> {
  const err = await readError(response)
  if (response.status === 403) {
    throw new ExportPermissionClientError(err.message)
  }
  if (response.status === 400) {
    throw new ExportValidationClientError(err.message)
  }
  if (response.status === 422) {
    throw new ExportLimitClientError(err.message)
  }
  throw new ExportServiceError(err.message, err.code)
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await apiFetch(path, init)
  } catch (error) {
    if (error instanceof HttpNetworkError) throw new ExportNetworkError()
    throw error
  }
}

export type CreateExportPayload = {
  type: ExportType
  format: ExportFormat
  filters: Record<string, unknown>
  columns: string[]
  sortBy: string
  sortDir: 'asc' | 'desc'
  fileName?: string
}

export async function getExportMetaRequest(): Promise<ExportMeta> {
  const response = await request(estoqueExportConfig.metaPath)
  if (!response.ok) await mapError(response)
  return exportMetaSchema.parse(await response.json())
}

export async function getExportLookupsRequest(): Promise<ExportLookups> {
  const response = await request('/api/estoque/lookups')
  if (!response.ok) await mapError(response)
  return stockLookupsSchema.parse(await response.json())
}

export async function previewExportRequest(
  payload: Omit<CreateExportPayload, 'format' | 'columns' | 'fileName'>,
): Promise<ExportPreview> {
  const response = await request(estoqueExportConfig.previewPath, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!response.ok) await mapError(response)
  return exportPreviewSchema.parse(await response.json())
}

export async function createExportRequest(
  payload: CreateExportPayload,
): Promise<ExportJob> {
  const response = await request(estoqueExportConfig.createPath, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!response.ok) await mapError(response)
  return exportJobSchema.parse(await response.json())
}

export async function listExportsRequest(params: {
  page?: number
  pageSize?: number
}): Promise<ExportHistory> {
  const q = new URLSearchParams()
  if (params.page) q.set('page', String(params.page))
  if (params.pageSize) q.set('pageSize', String(params.pageSize))
  const suffix = q.toString() ? `?${q}` : ''
  const response = await request(`${estoqueExportConfig.listPath}${suffix}`)
  if (!response.ok) await mapError(response)
  return exportHistorySchema.parse(await response.json())
}

export async function getExportRequest(id: string): Promise<ExportJob> {
  const response = await request(estoqueExportConfig.detailPath(id))
  if (!response.ok) await mapError(response)
  return exportJobSchema.parse(await response.json())
}

export async function cancelExportRequest(id: string): Promise<ExportJob> {
  const response = await request(estoqueExportConfig.cancelPath(id), {
    method: 'POST',
  })
  if (!response.ok) await mapError(response)
  return exportJobSchema.parse(await response.json())
}

export async function retryExportRequest(id: string): Promise<ExportJob> {
  const response = await request(estoqueExportConfig.retryPath(id), {
    method: 'POST',
  })
  if (!response.ok) await mapError(response)
  return exportJobSchema.parse(await response.json())
}

export function exportDownloadUrl(id: string): string {
  return estoqueExportConfig.downloadPath(id)
}
