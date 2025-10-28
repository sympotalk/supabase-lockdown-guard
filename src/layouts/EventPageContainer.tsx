// [71-H.9.REBUILD-FINAL] Event page flex-row wrapper (main + panel)
import React from "react";

interface EventPageContainerProps {
  children: React.ReactNode;
}

export default function EventPageContainer({ children }: EventPageContainerProps) {
  const childArray = React.Children.toArray(children);
  const main = childArray[0];
  const panel = childArray[1];

  return (
    <div className="participants-wrapper">
      <div className="participants-main">{main}</div>
      {panel && <aside className="participants-panel">{panel}</aside>}
    </div>
  );
}
