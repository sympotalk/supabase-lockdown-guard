import { useEffect, useState } from "react";

interface LiveRegionProps {
  message?: string;
  role?: "status" | "alert";
  politeness?: "polite" | "assertive";
}

/**
 * 스크린리더를 위한 실시간 알림 영역
 * aria-live를 사용하여 동적 콘텐츠 변경을 알림
 */
export function LiveRegion({
  message,
  role = "status",
  politeness = "polite",
}: LiveRegionProps) {
  const [displayMessage, setDisplayMessage] = useState("");

  useEffect(() => {
    if (message) {
      setDisplayMessage(message);

      // 메시지를 일정 시간 후 제거 (다음 메시지를 위해)
      const timer = setTimeout(() => {
        setDisplayMessage("");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div
      role={role}
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {displayMessage}
    </div>
  );
}

/**
 * 전역 LiveRegion을 위한 컨텍스트와 훅
 */
let globalAnnouncementCallback: ((message: string) => void) | null = null;

export function GlobalLiveRegion() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    globalAnnouncementCallback = setMessage;
    return () => {
      globalAnnouncementCallback = null;
    };
  }, []);

  return <LiveRegion message={message} />;
}

/**
 * 어디서든 스크린리더 알림을 트리거하는 함수
 */
export function announce(message: string) {
  if (globalAnnouncementCallback) {
    globalAnnouncementCallback(message);
  }
}
