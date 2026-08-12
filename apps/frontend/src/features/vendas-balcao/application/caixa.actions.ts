import {
  closeCaixaRequest,
  getCaixaRequest,
  openCaixaRequest,
  previewCloseCaixaRequest,
} from '../infrastructure/caixa.api'

export async function getCaixaAction() {
  return getCaixaRequest()
}

export async function openCaixaAction(input: {
  registerId?: string
  openingAmount: number
  notes?: string
}) {
  return openCaixaRequest(input)
}

export async function previewCloseCaixaAction() {
  return previewCloseCaixaRequest()
}

export async function closeCaixaAction(input: {
  closingAmount: number
  notes?: string
}) {
  return closeCaixaRequest(input)
}
