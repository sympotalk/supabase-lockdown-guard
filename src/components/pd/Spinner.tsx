import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * 표준 로딩 스피너
 * 1200ms 이내 작업에 사용
 */
export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  };

  return (
    <div className="flex items-center justify-center" role="status" aria-label="로딩 중">
      <div
        className={cn(
          "animate-spin rounded-full border-primary border-t-transparent",
          sizeClasses[size],
          className
        )}
      />
      <span className="sr-only">로딩 중...</span>
    </div>
  );
}

/**
 * 전체 화면 스피너 (페이지 로딩용)
 */
export function FullPageSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Spinner size="lg" />
    </div>
  );
}

/**
 * 버튼 내 스피너
 */
export function ButtonSpinner({ className }: { className?: string }) {
  return (
    <Spinner
      size="sm"
      className={cn("h-4 w-4", className)}
    />
  );
}
