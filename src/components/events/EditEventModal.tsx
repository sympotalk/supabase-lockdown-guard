// [LOCKED][71-H2.REBUILD.EVENTCARD.STATS.LINE] Event edit modal
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Event {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string | null;
  status: string | null;
}

interface EditEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event;
  onUpdated?: () => void;
}

export function EditEventModal({ open, onOpenChange, event, onUpdated }: EditEventModalProps) {
  const [form, setForm] = useState({ ...event });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({
          name: form.name,
          start_date: form.start_date,
          end_date: form.end_date,
          location: form.location,
        })
        .eq("id", event.id);

      if (error) throw error;

      toast({ 
        title: "수정 완료", 
        description: `${form.name} 정보가 변경되었습니다.` 
      });
      onOpenChange(false);
      onUpdated?.();
    } catch (error: any) {
      toast({ 
        title: "수정 실패", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>행사 정보 수정</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>행사명</Label>
            <Input 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
              className="mt-1"
            />
          </div>

          <div>
            <Label>일정</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>장소</Label>
            <Input 
              value={form.location || ""} 
              onChange={(e) => setForm({ ...form, location: e.target.value })} 
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
