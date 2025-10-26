// [LOCKED][70.4+71-I] SmartBadges component for participant memo management
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Category {
  key: string;
  icon: string;
  label: string;
  items: string[];
}

const CATEGORIES: Category[] = [
  { key: "room", icon: "🏷️", label: "객실등급", items: ["프리미엄", "디럭스", "스탠다드"] },
  { key: "bedding", icon: "💤", label: "침구", items: ["엑스트라베드", "소파베드", "침대가드"] },
  { key: "infant", icon: "🍼", label: "유아용품", items: ["아기침대", "아기욕조", "유모차"] },
  { key: "appliance", icon: "🌿", label: "가전", items: ["공기청정기", "가습기"] },
  { key: "location", icon: "🏙️", label: "위치", items: ["고층", "뷰 좋은 곳", "금연"] },
  { key: "special", icon: "🍷", label: "특별요청", items: ["룸서비스", "원장님 인접"] },
];

interface SmartBadgesProps {
  currentMemo: string;
  onMemoChange: (newMemo: string) => void;
}

export function SmartBadges({ currentMemo, onMemoChange }: SmartBadgesProps) {
  const [customInput, setCustomInput] = useState("");

  const appendMemo = (label: string) => {
    const memoItems = currentMemo ? currentMemo.split(" / ").filter(Boolean) : [];
    
    if (memoItems.includes(label)) {
      toast.info("이미 추가된 항목입니다");
      return;
    }

    const newMemo = [...memoItems, label].join(" / ");
    onMemoChange(newMemo);
    toast.success(`"${label}" 추가됨`);
  };

  const removeMemoItem = (label: string) => {
    const memoItems = currentMemo ? currentMemo.split(" / ").filter(Boolean) : [];
    const newMemo = memoItems.filter(item => item !== label).join(" / ");
    onMemoChange(newMemo);
    toast.success(`"${label}" 제거됨`);
  };

  const addCustom = () => {
    if (!customInput.trim()) return;
    appendMemo(customInput.trim());
    setCustomInput("");
  };

  const currentItems = currentMemo ? currentMemo.split(" / ").filter(Boolean) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">SmartBadge 요청사항</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current badges */}
        {currentItems.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
            {currentItems.map((item, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={() => removeMemoItem(item)}
              >
                {item} ✕
              </Badge>
            ))}
          </div>
        )}

        {/* Category buttons */}
        <div className="space-y-3">
          {CATEGORIES.map((cat) => (
            <div key={cat.key} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {cat.items.map((item) => (
                  <Button
                    key={item}
                    size="sm"
                    variant={currentItems.includes(item) ? "default" : "outline"}
                    onClick={() => appendMemo(item)}
                    className="h-7 text-xs"
                  >
                    {item}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Custom input */}
        <div className="space-y-2 pt-2 border-t">
          <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <span>💎</span>
            <span>직접 입력</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="요청사항 입력..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addCustom()}
              className="h-8 text-sm"
            />
            <Button size="sm" onClick={addCustom} className="h-8">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
