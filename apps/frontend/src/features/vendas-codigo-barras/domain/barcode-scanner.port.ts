/**
 * Porta para fontes de leitura de código de barras.
 * Leitores USB HID já funcionam via teclado no campo.
 * Adapter de câmera pode implementar esta interface no futuro.
 */
export type BarcodeScanSource = 'keyboard' | 'camera'

export type BarcodeScanEvent = {
  code: string
  source: BarcodeScanSource
}

export interface BarcodeScannerPort {
  /** Inicia captura (ex.: câmera). No-op para teclado HID. */
  start?(): Promise<void> | void
  stop?(): Promise<void> | void
  /** Emite códigos lidos (câmera). Teclado usa o input nativo. */
  subscribe?(listener: (event: BarcodeScanEvent) => void): () => void
}

/** Stub preparado para scanner via câmera — não montado na UI ainda. */
export class CameraBarcodeScannerStub implements BarcodeScannerPort {
  async start(): Promise<void> {
    throw new Error(
      'Scanner por câmera ainda não está disponível neste ambiente.',
    )
  }

  stop(): void {
    // no-op
  }

  subscribe(): () => void {
    return () => undefined
  }
}
