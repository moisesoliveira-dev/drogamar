import { lookupBarcodeRequest } from '../infrastructure/codigo-barras.api'

export async function lookupBarcodeAction(code: string) {
  return lookupBarcodeRequest(code)
}
