import { promotionFormSchema, type PromotionFormValues } from '../domain/promocao.schema'
import {
  activatePromocaoRequest,
  cancelPromocaoRequest,
  createPromocaoRequest,
  deletePromocaoRequest,
  getDashboardRequest,
  getLookupsRequest,
  getPromocaoRequest,
  listPromocoesRequest,
  pausePromocaoRequest,
  simulatePromocaoRequest,
  updatePromocaoRequest,
} from '../infrastructure/promocao.api'

export async function listPromocoesAction(params: {
  search?: string
  status?: string
}) {
  return listPromocoesRequest(params)
}

export async function getDashboardAction() {
  return getDashboardRequest()
}

export async function getLookupsAction() {
  return getLookupsRequest()
}

export async function getPromocaoAction(id: string) {
  return getPromocaoRequest(id)
}

export async function savePromocaoAction(
  values: PromotionFormValues,
  id?: string,
) {
  const parsed = promotionFormSchema.parse(values)
  if (id) return updatePromocaoRequest(id, parsed)
  return createPromocaoRequest(parsed)
}

export async function activatePromocaoAction(id: string) {
  return activatePromocaoRequest(id)
}

export async function pausePromocaoAction(id: string) {
  return pausePromocaoRequest(id)
}

export async function cancelPromocaoAction(id: string) {
  return cancelPromocaoRequest(id)
}

export async function deletePromocaoAction(id: string) {
  return deletePromocaoRequest(id)
}

export async function simulatePromocaoAction(input: {
  stockItemId: string
  quantity: number
  promotionId?: string
}) {
  return simulatePromocaoRequest(input)
}
