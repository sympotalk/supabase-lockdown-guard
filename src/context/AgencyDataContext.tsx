// [LOCKED][71-D.FIXFLOW.STABLE] Do not remove or inline this block without architect/QA approval.
import React, { createContext, useContext, ReactNode } from 'react';
import { useAgencyEventProgress, AgencyEventProgress } from '@/hooks/agency/useAgencyEventProgress';
import { useAgencyEventCounts, EventCounts } from '@/hooks/agency/useAgencyEventCounts';
import type { SWRResponse } from 'swr';

interface AgencyDataContextValue {
  eventProgress: SWRResponse<AgencyEventProgress[], any, any>;
  counts: SWRResponse<EventCounts, any, any>;
}

const AgencyDataContext = createContext<AgencyDataContextValue | null>(null);

export function AgencyDataProvider({ children }: { children: ReactNode }) {
  const eventProgress = useAgencyEventProgress();
  const counts = useAgencyEventCounts();

  return (
    <AgencyDataContext.Provider value={{ eventProgress, counts }}>
      {children}
    </AgencyDataContext.Provider>
  );
}

export const useAgencyData = () => {
  const context = useContext(AgencyDataContext);
  if (!context) {
    throw new Error('useAgencyData must be used within AgencyDataProvider');
  }
  return context;
};
