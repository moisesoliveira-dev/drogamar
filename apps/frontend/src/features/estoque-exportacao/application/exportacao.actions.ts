import {
  cancelExportRequest,
  createExportRequest,
  getExportLookupsRequest,
  getExportMetaRequest,
  getExportRequest,
  listExportsRequest,
  previewExportRequest,
  retryExportRequest,
  type CreateExportPayload,
} from '../infrastructure/exportacao.api'

export async function loadExportMetaAction() {
  return getExportMetaRequest()
}

export async function loadExportLookupsAction() {
  return getExportLookupsRequest()
}

export async function previewExportAction(
  payload: Omit<CreateExportPayload, 'format' | 'columns' | 'fileName'>,
) {
  return previewExportRequest(payload)
}

export async function createExportAction(payload: CreateExportPayload) {
  return createExportRequest(payload)
}

export async function listExportsAction(page: number, pageSize = 10) {
  return listExportsRequest({ page, pageSize })
}

export async function getExportAction(id: string) {
  return getExportRequest(id)
}

export async function cancelExportAction(id: string) {
  return cancelExportRequest(id)
}

export async function retryExportAction(id: string) {
  return retryExportRequest(id)
}
