// [71-J.2-FINAL] Participants panel global state
import { create } from 'zustand';

interface ParticipantsPanelState {
  selectedRowId: string | null;
  isOpen: boolean;
  currentTab: 'basic' | 'manager' | 'lodging' | 'requests';
  
  open: (rowId: string) => void;
  close: () => void;
  toggle: () => void;
  setTab: (tab: 'basic' | 'manager' | 'lodging' | 'requests') => void;
}

export const useParticipantsPanel = create<ParticipantsPanelState>((set) => ({
  selectedRowId: null,
  isOpen: false,
  currentTab: 'basic',
  
  open: (rowId: string) => set({ selectedRowId: rowId, isOpen: true }),
  close: () => set({ isOpen: false, selectedRowId: null }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setTab: (tab) => set({ currentTab: tab }),
}));
