export class CaixaBancosNetworkError extends Error {
  constructor(message = "Falha de conexão. Tente novamente.") {
    super(message);
    this.name = "CaixaBancosNetworkError";
  }
}

export class CaixaBancosServiceError extends Error {
  readonly code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "CaixaBancosServiceError";
    this.code = code;
  }
}

export function mapCaixaBancosError(error: unknown): string {
  if (error instanceof CaixaBancosNetworkError) return error.message;
  if (error instanceof CaixaBancosServiceError) return error.message;
  if (error instanceof Error) return error.message;
  return "Não foi possível concluir a operação.";
}
