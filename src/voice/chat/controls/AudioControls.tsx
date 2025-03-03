// src/voice/chat/controls/AudioControls.tsx
import { memo } from "react";
import { useFFTStore } from "@/hooks/useFFTStore";
import { MuteToggle } from "@/voice/chat/audio/MuteToggle";
import MicFFT from "@/voice/chat/audio/MicFFT";

export const AudioControls = memo(() => {
  const micFft = useFFTStore(state => state.micFft);

  return (
    <div className="flex items-center gap-4">
      <MuteToggle />
      <div className="relative grid h-8 w-48 shrink grow-0">
        <MicFFT fft={micFft} className="fill-current text-foreground" />
      </div>
    </div>
  );
});
