import {
  configureChannelRequest,
  disconnectChannelRequest,
  getLojaLookupsRequest,
  getOverviewRequest,
  getProductRequest,
  getSyncJobRequest,
  listProductsRequest,
  listSyncJobsRequest,
  publishProductRequest,
  startSyncRequest,
  unpublishProductRequest,
  updateProductRequest,
  type ListProductsParams,
} from '../infrastructure/loja.api'

export async function getOverviewAction() {
  return getOverviewRequest()
}

export async function configureChannelAction(body: {
  name: string
  platform?: 'GENERIC' | 'CUSTOM'
  baseUrl?: string
  credentials?: string
}) {
  return configureChannelRequest(body)
}

export async function disconnectChannelAction() {
  return disconnectChannelRequest()
}

export async function listProductsAction(params: ListProductsParams) {
  return listProductsRequest(params)
}

export async function getProductAction(itemId: string) {
  return getProductRequest(itemId)
}

export async function updateProductAction(
  itemId: string,
  body: Record<string, unknown>,
) {
  return updateProductRequest(itemId, body)
}

export async function publishProductAction(itemId: string) {
  return publishProductRequest(itemId)
}

export async function unpublishProductAction(itemId: string) {
  return unpublishProductRequest(itemId)
}

export async function startSyncAction(body: {
  syncProducts: boolean
  syncStock: boolean
  syncPrices: boolean
}) {
  return startSyncRequest(body)
}

export async function listSyncJobsAction(page = 1) {
  return listSyncJobsRequest(page, 10)
}

export async function getSyncJobAction(id: string) {
  return getSyncJobRequest(id)
}

export async function getLojaLookupsAction() {
  return getLojaLookupsRequest()
}
