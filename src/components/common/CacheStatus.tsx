import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

/**
 * Phase 3.10-A: Cache Status Indicator
 * Shows when the app is using cached data due to network issues
 */
export function CacheStatus() {
  const [showWarning, setShowWarning] = useState(false);
  
  useEffect(() => {
    // Listen for cache fallback events
    const handleCacheFallback = () => {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 5000);
    };

    window.addEventListener("cache-fallback", handleCacheFallback);
    
    return () => {
      window.removeEventListener("cache-fallback", handleCacheFallback);
    };
  }, []);

  if (!showWarning) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top">
      <Badge variant="secondary" className="gap-2 px-3 py-2 shadow-lg">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <span className="text-sm">⚠ 데이터 일부 캐시로 표시</span>
      </Badge>
    </div>
  );
}
