// [Phase 77-A] 참가자 요청사항 뱃지 (우선순위별 표시)
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Baby, Bed, Shield, Wind, Eye, ArrowUp } from "lucide-react";

interface ParticipantRequestsBadgesProps {
  participantId: string;
  eventId: string;
  maxVisible?: number;
}

export default function ParticipantRequestsBadges({
  participantId,
  eventId,
  maxVisible = 3
}: ParticipantRequestsBadgesProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, [participantId, eventId]);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("participant_requests")
        .select("*")
        .eq("participant_id", participantId)
        .eq("event_id", eventId)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('[Phase 77-A] 요청사항 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || requests.length === 0) return null;

  const getIcon = (requestValue: string) => {
    const value = requestValue.toLowerCase();
    if (value.includes('아기') || value.includes('infant')) return <Baby className="w-3 h-3" />;
    if (value.includes('베드') || value.includes('bed')) return <Bed className="w-3 h-3" />;
    if (value.includes('가드') || value.includes('guard')) return <Shield className="w-3 h-3" />;
    if (value.includes('가습') || value.includes('공기')) return <Wind className="w-3 h-3" />;
    if (value.includes('뷰') || value.includes('view')) return <Eye className="w-3 h-3" />;
    return null;
  };

  const getPriorityVariant = (priority: number): "default" | "destructive" | "secondary" | "outline" => {
    if (priority === 1) return "destructive"; // 필수
    if (priority === 2) return "default"; // 선호
    if (priority === 3) return "secondary"; // 편의
    return "outline"; // 뷰/층
  };

  const visibleRequests = requests.slice(0, maxVisible);
  const hiddenCount = requests.length - maxVisible;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 flex-wrap">
        {visibleRequests.map((req) => (
          <Tooltip key={req.id}>
            <TooltipTrigger asChild>
              <Badge 
                variant={getPriorityVariant(req.priority)} 
                className="text-xs gap-1 cursor-help"
              >
                {getIcon(req.request_value)}
                {req.request_value}
                {req.priority === 1 && <ArrowUp className="w-3 h-3" />}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                우선순위: {req.priority} ({
                  req.priority === 1 ? '필수' :
                  req.priority === 2 ? '선호' :
                  req.priority === 3 ? '편의' : '뷰/층'
                })
              </p>
              {req.is_fulfilled && <p className="text-xs text-green-600">✓ 처리 완료</p>}
            </TooltipContent>
          </Tooltip>
        ))}
        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs cursor-help">
                +{hiddenCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{hiddenCount}개의 추가 요청사항</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
