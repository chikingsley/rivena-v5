// src/voice/chat/controls/Controls.tsx
import { memo } from "react";
import { AudioControls } from "@/voice/chat/controls/AudioControls";
import { EndCallButton } from "@/voice/chat/controls/EndCallButton";

interface ControlsProps {
  onEndCall: () => void;
  isTransitioning?: boolean;
}

const Controls = memo(({ onEndCall }: ControlsProps) => {
  return (
    <div className="p-4 bg-card text-card-foreground border border-border rounded-lg shadow-sm flex items-center gap-4">
      <AudioControls />
      <EndCallButton onEndCall={onEndCall} />
    </div>
  );
});

export default Controls;
