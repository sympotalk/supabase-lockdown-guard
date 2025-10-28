// [72-RULE.R2] Rooming Rules Management Panel
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, RefreshCw } from "lucide-react";

interface RoomingRule {
  id: string;
  min_adult: number;
  max_adult: number;
  min_child: number;
  max_child: number;
  preferred_room_type: string;
  allow_extra_bed: boolean;
  priority: number;
}

interface RulesPanelProps {
  eventId: string;
  roomTypes: string[];
}

export default function RulesPanel({ eventId, roomTypes }: RulesPanelProps) {
  const [rules, setRules] = useState<RoomingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRule, setNewRule] = useState({
    min_adult: 1,
    max_adult: 2,
    min_child: 0,
    max_child: 0,
    preferred_room_type: "",
    allow_extra_bed: false,
    priority: 50,
  });

  useEffect(() => {
    loadRules();
  }, [eventId]);

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from("rooming_rules")
        .select("*")
        .eq("event_id", eventId)
        .eq("is_active", true)
        .order("priority", { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error: any) {
      toast.error("룰셋 로드 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async () => {
    if (!newRule.preferred_room_type) {
      toast.error("객실 타입을 선택해주세요");
      return;
    }

    try {
      const { error } = await supabase.from("rooming_rules").insert({
        event_id: eventId,
        ...newRule,
      });

      if (error) throw error;

      toast.success("룰셋이 추가되었습니다", { duration: 1200 });
      loadRules();
      
      // Reset form
      setNewRule({
        min_adult: 1,
        max_adult: 2,
        min_child: 0,
        max_child: 0,
        preferred_room_type: "",
        allow_extra_bed: false,
        priority: 50,
      });
    } catch (error: any) {
      toast.error("추가 실패: " + error.message);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from("rooming_rules")
        .update({ is_active: false })
        .eq("id", ruleId);

      if (error) throw error;

      toast.success("룰셋이 삭제되었습니다", { duration: 1200 });
      loadRules();
    } catch (error: any) {
      toast.error("삭제 실패: " + error.message);
    }
  };

  const handleRefreshAssignments = async () => {
    try {
      const { data, error } = await supabase.rpc("refresh_rooming_assignments", {
        p_event_id: eventId,
      });

      if (error) throw error;

      const result = data as any;
      toast.success(`${result.refreshed || 0}명 재배정 완료`, { duration: 1500 });
    } catch (error: any) {
      toast.error("재배정 실패: " + error.message);
    }
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground">룰셋을 불러오는 중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add New Rule */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">새 룰셋 추가</h3>
          <Button onClick={handleRefreshAssignments} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            전체 재배정
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <Label>최소 성인</Label>
            <Input
              type="number"
              min="0"
              value={newRule.min_adult}
              onChange={(e) =>
                setNewRule({ ...newRule, min_adult: parseInt(e.target.value) })
              }
            />
          </div>
          <div>
            <Label>최대 성인</Label>
            <Input
              type="number"
              min="0"
              value={newRule.max_adult}
              onChange={(e) =>
                setNewRule({ ...newRule, max_adult: parseInt(e.target.value) })
              }
            />
          </div>
          <div>
            <Label>최소 소아</Label>
            <Input
              type="number"
              min="0"
              value={newRule.min_child}
              onChange={(e) =>
                setNewRule({ ...newRule, min_child: parseInt(e.target.value) })
              }
            />
          </div>
          <div>
            <Label>최대 소아</Label>
            <Input
              type="number"
              min="0"
              value={newRule.max_child}
              onChange={(e) =>
                setNewRule({ ...newRule, max_child: parseInt(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <Label>객실 타입</Label>
            <Select
              value={newRule.preferred_room_type}
              onValueChange={(value) =>
                setNewRule({ ...newRule, preferred_room_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="객실 선택" />
              </SelectTrigger>
              <SelectContent>
                {roomTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>우선순위</Label>
            <Input
              type="number"
              value={newRule.priority}
              onChange={(e) =>
                setNewRule({ ...newRule, priority: parseInt(e.target.value) })
              }
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAddRule} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              추가
            </Button>
          </div>
        </div>
      </Card>

      {/* Existing Rules */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">등록된 룰셋 ({rules.length})</h3>
        {rules.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            등록된 룰셋이 없습니다. 위에서 새 룰셋을 추가해주세요.
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground">성인</span>
                    <p className="font-medium">
                      {rule.min_adult} ~ {rule.max_adult}명
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">소아</span>
                    <p className="font-medium">
                      {rule.min_child} ~ {rule.max_child}명
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">객실</span>
                    <p className="font-medium">{rule.preferred_room_type}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">우선순위</span>
                    <Badge variant="outline">{rule.priority}</Badge>
                  </div>
                  <div className="flex items-center justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
