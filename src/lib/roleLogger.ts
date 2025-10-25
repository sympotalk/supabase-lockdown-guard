/**
 * Role Context Logger
 * Logs role and agency context changes for debugging and monitoring
 */

export function notifyRoleChange(context: string | null, userName?: string) {
  const agencyName = context ? `에이전시 모드 (${context})` : "마스터 모드";
  const userInfo = userName ? ` | User: ${userName}` : "";
  console.log(`[RLS] Context active: ${agencyName}${userInfo}`);
}

export function logContextSwitch(fromContext: string | null, toContext: string, agencyName?: string) {
  const from = fromContext || "MASTER";
  const to = toContext || "MASTER";
  const name = agencyName ? ` (${agencyName})` : "";
  console.log(`[RLS] Context switched: ${from} → ${to}${name}`);
}

export function logRoleAccess(tableName: string, operation: string, allowed: boolean) {
  const status = allowed ? "✓ ALLOWED" : "✗ DENIED";
  console.log(`[RLS] ${status} | Table: ${tableName} | Operation: ${operation}`);
}
