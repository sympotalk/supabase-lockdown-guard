// [Phase 78-B.3] MASTER-only button to clear all participants
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { mutate } from "swr";
import { useUser } from "@/context/UserContext";

interface ClearAllParticipantsButtonProps {
  eventId: string;
}

export function ClearAllParticipantsButton({ eventId }: ClearAllParticipantsButtonProps) {
  const { toast } = useToast();
  const { user, agencyScope } = useUser();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  
  // Only show for MASTER role
  const isMaster = user?.user_metadata?.role === 'master';
  
  if (!isMaster) return null;
  
  const handleClear = async () => {
    setClearing(true);
    
    try {
      const { data, error } = await supabase.rpc('clear_event_participants', {
        p_event_id: eventId
      });
      
      if (error) throw error;
      
      const result = data as { status: string; deleted: number };
      
      if (result.status === 'ok') {
        toast({
          title: "모든 참가자가 삭제되었습니다",
          description: `${result.deleted}명의 참가자를 삭제했습니다.`
        });
        
        // Invalidate cache
        if (agencyScope) {
          await mutate(`participants_${agencyScope}_${eventId}`);
        }
        
        setConfirmOpen(false);
      }
    } catch (err: any) {
      console.error("[78-B.3] Clear error:", err);
      toast({
        title: "삭제 실패",
        description: err.message || "알 수 없는 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setClearing(false);
    }
  };
  
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        모든 참가자 삭제 (MASTER)
      </Button>
      
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 모든 참가자를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 연결된 데이터가 손실될 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClear}
              disabled={clearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearing ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
