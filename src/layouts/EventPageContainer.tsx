// [UNLOCKED-PATCH-71-H9] Event Page Container - Splits main content and right panel
import React from "react";

interface EventPageContainerProps {
  children: React.ReactNode;
}

export default function EventPageContainer({ children }: EventPageContainerProps) {
  const childArray = React.Children.toArray(children);
  const main = childArray[0];
  const right = childArray[1];

  return (
    <div className="event-page-container">
      <div className="event-main">{main}</div>
      <aside className="event-panel">{right}</aside>
    </div>
  );
}
