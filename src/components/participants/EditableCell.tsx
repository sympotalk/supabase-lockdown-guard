// [Phase 73-L.7.31] Editable cell component for inline editing
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  type?: "text" | "textarea";
  placeholder?: string;
  className?: string;
  maxLength?: number;
  required?: boolean;
  cellClassName?: string;
}

export function EditableCell({
  value,
  onSave,
  type = "text",
  placeholder = "",
  className = "",
  maxLength,
  required = false,
  cellClassName = "",
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      if (type === "text") {
        inputRef.current?.focus();
        inputRef.current?.select();
      } else {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }
    }
  }, [isEditing, type]);

  const handleSave = async () => {
    // [Phase 73-L.7.31] Required field validation
    if (required && !editValue.trim()) {
      return;
    }

    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      
      // [Phase 73-L.7.31] Show highlight animation
      setIsHighlighted(true);
      setTimeout(() => setIsHighlighted(false), 1000);
      
      setIsEditing(false);
    } catch (error) {
      console.error("[EditableCell] Save error:", error);
      // Revert on error
      setEditValue(value);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-1", cellClassName)} onClick={(e) => e.stopPropagation()}>
        {type === "text" ? (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={isSaving}
            className={cn("h-8 text-sm", className)}
          />
        ) : (
          <Textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={isSaving}
            rows={2}
            className={cn("text-sm resize-none", className)}
          />
        )}
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-1 hover:bg-green-100 rounded text-green-600 disabled:opacity-50"
            title="저장 (Enter)"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="p-1 hover:bg-red-100 rounded text-red-600 disabled:opacity-50"
            title="취소 (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={cn(
        "cursor-pointer hover:bg-accent/50 px-2 py-1 rounded transition-all duration-300",
        isHighlighted && "bg-primary/10 animate-pulse",
        cellClassName
      )}
      title="클릭하여 수정"
    >
      <span className={cn("text-sm", !value && "text-muted-foreground")}>
        {value || placeholder || "-"}
      </span>
    </div>
  );
}
