// [Phase 73-L.7.26] Participant utility functions

/**
 * Normalize role_badge value to eliminate "선택" state and standardize variants
 * [Phase 73-L.7.31-B] Convert all variants to standard 3-type system
 * Always returns "참석자" for invalid/empty values or legacy values
 */
export function normalizeRoleBadge(role?: string | null): string {
  if (!role || role === '' || role === '선택' || role === 'Select' || role.trim() === '') {
    return '참석자';
  }
  
  const normalized = role.trim();
  
  // [Phase 73-L.7.31-B] Convert legacy values to '참석자'
  const legacyValues = ['참가자', '패널', '스폰서', 'Participant', 'Panel', 'Sponsor'];
  if (legacyValues.includes(normalized)) {
    return '참석자';
  }
  
  // Only allow: 참석자, 좌장, 연자
  const allowedValues = ['참석자', '좌장', '연자'];
  return allowedValues.includes(normalized) ? normalized : '참석자';
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
 * [Phase 73-L.7.31-B] Updated to 3-type color system
 */
export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case '좌장':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case '연자':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case '참석자':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    default:
      return 'bg-blue-100 text-blue-800 border-blue-300'; // Default to '참석자' style
  }
}
