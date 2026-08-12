export type StoredPromotionStatus =
  'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CANCELLED';

export type DerivedPromotionStatus =
  'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'CANCELLED';

export function derivePromotionStatus(input: {
  status: StoredPromotionStatus;
  startsAt: Date;
  endsAt: Date;
  now?: Date;
}): DerivedPromotionStatus {
  if (input.status === 'DRAFT') return 'DRAFT';
  if (input.status === 'PAUSED') return 'PAUSED';
  if (input.status === 'CANCELLED') return 'CANCELLED';
  const now = input.now ?? new Date();
  if (now < input.startsAt) return 'SCHEDULED';
  if (now > input.endsAt) return 'EXPIRED';
  return 'ACTIVE';
}

export function assertValidPeriod(startsAt: Date, endsAt: Date) {
  if (!(startsAt instanceof Date) || Number.isNaN(startsAt.getTime())) {
    throw new Error('INVALID_PERIOD');
  }
  if (!(endsAt instanceof Date) || Number.isNaN(endsAt.getTime())) {
    throw new Error('INVALID_PERIOD');
  }
  if (startsAt >= endsAt) {
    throw new Error('INVALID_PERIOD');
  }
}
