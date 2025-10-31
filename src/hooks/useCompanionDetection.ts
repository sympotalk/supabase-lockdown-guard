// [Phase 77-E] AI 동반의료인 감지 훅
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CompanionCandidate {
  source_id: string;
  source_name: string;
  target_id: string;
  target_name: string;
  confidence: number;
  reason: string;
  text: string;
}

export function useCompanionDetection() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [candidates, setCandidates] = useState<CompanionCandidate[]>([]);
  const [showModal, setShowModal] = useState(false);

  const detectCompanions = async (eventId: string) => {
    setIsDetecting(true);
    try {
      const { data, error } = await supabase.rpc("ai_detect_companions_from_memo", {
        p_event_id: eventId,
      });

      if (error) throw error;

      const detectedCandidates = (data as unknown) as CompanionCandidate[];
      console.log("[Phase 77-E] AI 동반의료인 감지 결과:", detectedCandidates);

      if (detectedCandidates.length === 0) {
        toast.info("동반의료인 감지 결과 없음", {
          description: "메모에서 동반 관계를 찾지 못했습니다.",
        });
        return { autoLinked: 0, needsReview: 0 };
      }

      // 확신도 90% 이상 → 자동 연결
      const highConfidence = detectedCandidates.filter((c) => c.confidence >= 0.9);
      let autoLinked = 0;

      for (const candidate of highConfidence) {
        try {
          await supabase.rpc("link_companions_pair", {
            p_source_id: candidate.source_id,
            p_target_id: candidate.target_id,
          });
          autoLinked++;
        } catch (error: any) {
          console.error("[Phase 77-E] 자동 연결 실패:", error);
        }
      }

      // 확신도 90% 미만 → 확인 모달 필요
      const lowConfidence = detectedCandidates.filter((c) => c.confidence < 0.9);

      if (autoLinked > 0) {
        toast.success(`${autoLinked}건 자동 연결 완료`, {
          description: "확신도가 높은 동반자 관계가 자동으로 등록되었습니다.",
        });
      }

      if (lowConfidence.length > 0) {
        setCandidates(lowConfidence);
        setShowModal(true);
      }

      return {
        autoLinked,
        needsReview: lowConfidence.length,
      };
    } catch (error: any) {
      console.error("[Phase 77-E] AI 동반의료인 감지 실패:", error);
      toast.error("동반의료인 감지 실패", {
        description: error.message,
      });
      return { autoLinked: 0, needsReview: 0 };
    } finally {
      setIsDetecting(false);
    }
  };

  return {
    isDetecting,
    detectCompanions,
    candidates,
    showModal,
    setShowModal,
  };
}
