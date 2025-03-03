// src/components/chat-window/Chat.tsx
import Messages from "./Messages";
import BottomControls from "../controls/BottomControls";
import { ComponentRef, useEffect, useRef } from "react";
import { Message, useSessionStore } from "../../hooks/useSessionStore";

interface ClientComponentProps {
  sessionId: string | null;
  onNewSession?: () => void;
}

function adaptMessages(messages: import('../../hooks/useSessionStore').Message[]): Message[] {
  return messages.map(msg => ({
    id: 'id' in msg ? msg.id : `${Date.now()}-${Math.random()}`,
    type: msg.type === 'assistant_message' || msg.type === 'user_message' 
      ? msg.type 
      : undefined,
    isDateMarker: msg.type === 'socket_connected',
    isVoiceMarker: msg.type === 'socket_disconnected',
    message: {
      content: 'content' in msg ? msg.content : msg.type,
      role: 'role' in msg ? msg.role : 'system'
    },
    timestamp: 'receivedAt' in msg ? msg.receivedAt.getTime() : Date.now(),
    models: 'models' in msg ? msg.models : undefined
  }));
}

export default function ClientComponent({ sessionId: urlSessionId }: ClientComponentProps) {
  const timeout = useRef<number | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);
  const messagesLength = useSessionStore(state => state.messages.length);

  // Handle auto-scrolling
  useEffect(() => {
    if (timeout.current) {
      window.clearTimeout(timeout.current);
    }

    timeout.current = window.setTimeout(() => {
      if (ref.current) {
        const scrollHeight = ref.current.scrollHeight;
        ref.current.scrollTo({
          top: scrollHeight,
          behavior: "smooth",
        });
      }
    }, 200);
  }, [messagesLength]); // Scroll when number of messages changes

  return (
    <div className={"relative grow flex flex-col mx-auto w-full h-full overflow-hidden"}>
        <Messages 
          ref={ref} 
          messages={adaptMessages(useSessionStore(state => state.messages))} 
          />
        <BottomControls 
          sessionId={urlSessionId || undefined}
          hasMessages={useSessionStore(state => state.messages.length) > 0}
        />
    </div>
  );
}
