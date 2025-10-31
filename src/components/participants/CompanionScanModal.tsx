import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";

interface CompanionCandidate {
  base_id: string;
  base_name: string;
  memo: string;
  candidates: Array<{
    id: string;
    name: string;
    phone?: string;
    match_type: string;
  }>;
}

interface CompanionScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onSuccess?: () => void;
}

export default function CompanionScanModal({ 
  open, 
  onOpenChange, 
  eventId,
  onSuccess 
}: CompanionScanModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [candidates, setCandidates] = useState<CompanionCandidate[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<Set<string>>(new Set());
  const [isLinking, setIsLinking] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.rpc('ai_extract_companions_from_notes', {
        p_event_id: eventId
      });

      if (error) throw error;

      const result = data as any;
      setCandidates(result.pairs || []);

      if (result.count === 0) {
        toast.info('동반자 후보 없음', {
          description: '메모에서 동반자 관련 정보를 찾을 수 없습니다.'
        });
      } else {
        toast.success('스캔 완료', {
          description: `${result.count}개의 동반자 후보를 발견했습니다.`
        });
      }
    } catch (error: any) {
      console.error('Companion scan error:', error);
      toast.error('스캔 실패', {
        description: error.message
      });
    } finally {
      setIsScanning(false);
    }
  };

  const togglePair = (baseId: string, candidateId: string) => {
    const pairKey = `${baseId}-${candidateId}`;
    const newSelected = new Set(selectedPairs);
    
    if (newSelected.has(pairKey)) {
      newSelected.delete(pairKey);
    } else {
      newSelected.add(pairKey);
    }
    
    setSelectedPairs(newSelected);
  };

  const handleCreateLinks = async () => {
    if (selectedPairs.size === 0) {
      toast.warning('선택된 페어 없음', {
        description: '링크할 동반자 쌍을 선택해주세요.'
      });
      return;
    }

    setIsLinking(true);
    try {
      const pairs = Array.from(selectedPairs).map(pairKey => {
        const [a, b] = pairKey.split('-');
        return { a, b };
      });

      const { data, error } = await supabase.rpc('link_companions', {
        p_event_id: eventId,
        p_pairs: pairs
      });

      if (error) throw error;

      const result = data as any;
      toast.success('동반자 링크 생성 완료', {
        description: `${result.linked}개의 동반자 관계가 생성되었습니다.`
      });

      onSuccess?.();
      onOpenChange(false);
      setCandidates([]);
      setSelectedPairs(new Set());
    } catch (error: any) {
      console.error('Link companions error:', error);
      toast.error('링크 생성 실패', {
        description: error.message
      });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            동반자 후보 스캔
          </DialogTitle>
          <DialogDescription>
            참가자 메모에서 동반의료인 정보를 자동으로 추출합니다
          </DialogDescription>
        </DialogHeader>

        {candidates.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              메모에서 동반자 관련 정보를 검색합니다
            </p>
            <Button 
              onClick={handleScan}
              disabled={isScanning}
              className="gap-2"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  스캔 중...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  스캔 시작
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[50vh] pr-4">
              <div className="space-y-4">
                {candidates.map((candidate, idx) => (
                  <div key={idx} className="p-4 border rounded-lg bg-accent/20">
                    <div className="mb-3">
                      <p className="font-semibold text-sm">{candidate.base_name}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        메모: {candidate.memo}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        동반자 후보:
                      </p>
                      {candidate.candidates.map((comp, compIdx) => (
                        <div 
                          key={compIdx}
                          className="flex items-center gap-3 p-2 hover:bg-background rounded border"
                        >
                          <Checkbox
                            checked={selectedPairs.has(`${candidate.base_id}-${comp.id}`)}
                            onCheckedChange={() => togglePair(candidate.base_id, comp.id)}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{comp.name}</p>
                            {comp.phone && (
                              <p className="text-xs text-muted-foreground">{comp.phone}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {comp.match_type === 'name' ? '이름' : '연락처'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedPairs.size}개 선택됨
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={isLinking}
                >
                  취소
                </Button>
                <Button 
                  onClick={handleCreateLinks}
                  disabled={isLinking || selectedPairs.size === 0}
                  className="gap-2"
                >
                  {isLinking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      링크 생성 중...
                    </>
                  ) : (
                    `${selectedPairs.size}개 링크 생성`
                  )}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
