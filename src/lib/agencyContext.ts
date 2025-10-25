/**
 * Agency Context Management
 * Handles MASTER -> AGENCY context switching via URL params and localStorage
 */

export function getAgencyContext(userId: string | undefined): string | null {
  if (!userId) return null;

  // Check for forced agency context via URL parameter
  const query = new URLSearchParams(window.location.search);
  const forcedAgency = query.get("asAgency");
  
  if (forcedAgency) {
    console.log("[RLS] Master context switched to agency:", forcedAgency);
    localStorage.setItem("agency_context", forcedAgency);
    return forcedAgency;
  }

  // Return stored context or user's own ID
  const storedContext = localStorage.getItem("agency_context");
  return storedContext || userId;
}

export function clearAgencyContext(): void {
  console.log("[RLS] Agency context cleared on logout");
  localStorage.removeItem("agency_context");
}

export function setAgencyContext(agencyId: string): void {
  console.log("[RLS] Agency context set to:", agencyId);
  localStorage.setItem("agency_context", agencyId);
}
