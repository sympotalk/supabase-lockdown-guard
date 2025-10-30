// [Phase 73-L.7.26] Participant utility functions

/**
 * Normalize role_badge value to eliminate "선택" state
 * Always returns "참석자" for invalid/empty values
 */
export function normalizeRoleBadge(role?: string | null): string {
  if (!role || role === '' || role === '선택' || role === 'Select' || role.trim() === '') {
    return '참석자';
  }
  return role.trim();
}

/**
 * Normalize participant data on load
 */
export function normalizeParticipant<T extends { fixed_role?: string | null }>(participant: T): T {
  return {
    ...participant,
    fixed_role: normalizeRoleBadge(participant.fixed_role)
  };
}

/**
 * Normalize array of participants
 */
export function normalizeParticipants<T extends { fixed_role?: string | null }>(participants: T[]): T[] {
  return participants.map(normalizeParticipant);
}

/**
 * Get color class for role badge
 */
export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case '좌장':
      return 'bg-[#6E59F6] text-white border-transparent';
    case '연자':
      return 'bg-[#3B82F6] text-white border-transparent';
    case '참석자':
      return 'bg-[#9CA3AF] text-white border-transparent';
    default:
      return 'bg-muted text-muted-foreground';
  }
}
