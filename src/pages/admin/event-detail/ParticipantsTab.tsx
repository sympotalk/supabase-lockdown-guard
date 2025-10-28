// [71-H.9.REBUILD-FINAL] Participants tab wrapper with state pass-through
import ParticipantsPanel from "./ParticipantsPanel";
import { useParams } from "react-router-dom";
import { useEffect, useRef } from "react";

interface ParticipantsTabProps {
  selectedParticipant: any;
  onSelectParticipant: (participant: any) => void;
}

export default function ParticipantsTab({ selectedParticipant, onSelectParticipant }: ParticipantsTabProps) {
  const { eventId } = useParams();
  const mutateRef = useRef<() => void>();
  
  // [71-H6.QA] Validate eventId propagation
  useEffect(() => {
    console.log('[71-H6.QA.Participants] Tab loaded', { eventId });
    if (!eventId) {
      console.warn('[71-H6.QA.Participants] ⚠ MISSING FIELD: eventId is undefined');
    }
  }, [eventId]);
  
  return (
    <ParticipantsPanel 
      selectedParticipant={selectedParticipant}
      onSelectParticipant={onSelectParticipant}
      onMutate={() => mutateRef.current?.()}
    />
  );
}
