// @locked-phase-90
// Phase 90-FINAL-QA-LOCK: QA lock utilities

export const isQALockMode = () => {
  return import.meta.env.VITE_PHASE_LOCK === '90';
};

export const checkQAPermission = (role?: string): boolean => {
  if (!isQALockMode()) return true;
  return role === 'master';
};

export const getQALockBanner = (): string | null => {
  if (!isQALockMode()) return null;
  return '🔒 Phase 90 QA Lock Mode - 검증 전용 모드';
};
