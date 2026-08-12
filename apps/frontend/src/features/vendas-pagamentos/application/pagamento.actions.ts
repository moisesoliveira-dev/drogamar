import {
  cancelPaymentRequest,
  finalizePaymentRequest,
  getPaymentSessionRequest,
  getReceiptRequest,
} from '../infrastructure/pagamento.api'

export async function getPaymentSessionAction() {
  return getPaymentSessionRequest()
}

export async function finalizePaymentAction(input: {
  idempotencyKey: string
  payments: Array<{
    method: string
    amount: number
    tenderedAmount?: number
  }>
}) {
  return finalizePaymentRequest(input)
}

export async function cancelPaymentAction() {
  return cancelPaymentRequest()
}

export async function getReceiptAction(receiptId: string) {
  return getReceiptRequest(receiptId)
}
