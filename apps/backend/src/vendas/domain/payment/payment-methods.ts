export type SupportedPaymentMethod = 'CASH';

export type PaymentMethodDefinition = {
  code: SupportedPaymentMethod;
  label: string;
  supportsChange: boolean;
  supportsInstallments: boolean;
  requiresIntegration: boolean;
  enabled: boolean;
};

/** Catálogo de meios — só CASH habilitado até haver integração real. */
export const PAYMENT_METHODS: PaymentMethodDefinition[] = [
  {
    code: 'CASH',
    label: 'Dinheiro',
    supportsChange: true,
    supportsInstallments: false,
    requiresIntegration: false,
    enabled: true,
  },
];

export function listEnabledPaymentMethods(): PaymentMethodDefinition[] {
  return PAYMENT_METHODS.filter((m) => m.enabled && !m.requiresIntegration);
}

export function isPaymentMethodEnabled(code: string): boolean {
  return listEnabledPaymentMethods().some((m) => m.code === code);
}
