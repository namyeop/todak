"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useRoomContext,
  useVoiceAssistant,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import styles from "./session-view.module.css";

interface SessionViewProps {
  token: string;
  url: string;
  onDisconnect: (reason: "user" | "timer" | "disconnect") => void;
}

export function SessionView({ token, url, onDisconnect }: SessionViewProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={url}
      connect={true}
      audio={true}
    >
      <RoomAudioRenderer />
      <SessionUI onDisconnect={onDisconnect} />
    </LiveKitRoom>
  );
}

function SessionUI({
  onDisconnect,
}: {
  onDisconnect: (reason: "user" | "timer" | "disconnect") => void;
}) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { agent, state: agentState } = useVoiceAssistant();
  const [elapsed, setElapsed] = useState(0);
  const wasConnected = useRef(false);
  const hadAgent = useRef(false);
  const hasEnded = useRef(false);
  const disconnectReasonRef = useRef<"user" | "timer" | "disconnect">("disconnect");

  // D6: 에이전트 대기 시간 추적
  const [waitingForAgent, setWaitingForAgent] = useState(true);
  const [waitElapsed, setWaitElapsed] = useState(0);

  useEffect(() => {
    if (hasEnded.current) return;
    if (connectionState === ConnectionState.Connected) {
      wasConnected.current = true;
    }
    if (wasConnected.current && connectionState === ConnectionState.Disconnected) {
      hasEnded.current = true;
      onDisconnect(disconnectReasonRef.current);
    }
  }, [connectionState, onDisconnect]);

  useEffect(() => {
    if (agent) {
      hadAgent.current = true;
      setWaitingForAgent(false);
      return;
    }
    if (!hadAgent.current || hasEnded.current) return;

    hasEnded.current = true;
    const reason = "disconnect";
    disconnectReasonRef.current = reason;
    void room.disconnect();
    onDisconnect(reason);
  }, [agent, elapsed, onDisconnect, room]);

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [connectionState]);

  // D6: 에이전트 대기 타이머
  useEffect(() => {
    if (!waitingForAgent) return;
    const interval = setInterval(() => setWaitElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [waitingForAgent]);

  // 타이머 종료 판단은 agent 측에서만 관리 (엔지니어링 리뷰 결정)

  const handleEnd = useCallback(() => {
    hasEnded.current = true;
    disconnectReasonRef.current = "user";
    room.disconnect();
    onDisconnect("user");
  }, [room, onDisconnect]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // D6: 에이전트 대기 중이면 호흡 오브 + 대기 메시지
  const orbClass = waitingForAgent
    ? styles.orbWaiting
    : agentState === "speaking"
      ? styles.orbSpeaking
      : agentState === "thinking"
        ? styles.orbThinking
        : agentState === "listening"
          ? styles.orbListening
          : styles.orb;

  const thinkingMessages = [
    "음..",
    "음 ..",
    "어..",
    "으음..",
  ];

  const [thinkingMsg, setThinkingMsg] = useState("");

  useEffect(() => {
    if (agentState === "thinking") {
      setThinkingMsg(
        thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)]
      );
    }
  }, [agentState]);

  // D5: 오브 상태를 aria-live로 알려줌
  const statusText = (() => {
    if (waitingForAgent) {
      return waitElapsed >= 10 ? "조금만 기다려주세요" : "준비하고 있어요...";
    }
    if (connectionState === ConnectionState.Connecting) return "연결 중";
    if (connectionState === ConnectionState.Reconnecting) return "다시 연결하는 중";
    if (agentState === "listening") return "듣고 있어요";
    if (agentState === "thinking") return thinkingMsg;
    if (agentState === "speaking") return "";
    return "";
  })();

  return (
    <div className={styles.page}>
      <p className={styles.time} aria-hidden="true">{timeStr}</p>

      {/* D5: aria-live로 오브 상태 변경 스크린리더에 전달 */}
      <div
        className={orbClass}
        role="status"
        aria-live="polite"
        aria-label={statusText || "대화 중"}
      />

      <p className={styles.status}>{statusText}</p>

      <button
        className={styles.end}
        onClick={handleEnd}
        aria-label="대화 종료"
      >
        그만할게
      </button>
    </div>
  );
}
