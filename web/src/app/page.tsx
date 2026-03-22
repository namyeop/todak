"use client";

import { useState, useCallback, useEffect } from "react";
import { SessionView } from "@/components/session-view";
import styles from "./page.module.css";

type AppState = "idle" | "connecting" | "connected" | "ended" | "error" | "mic-denied" | "daily-limit";
type EndReason = "user" | "timer" | "disconnect";

interface SessionData {
  token: string;
  url: string;
  sessionId: string;
  roomName: string;
}

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [endReason, setEndReason] = useState<EndReason | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    setIsReturning(localStorage.getItem("todak_has_session") === "true");
  }, []);

  const startSession = useCallback(async () => {
    try {
      // D2: 마이크 권한 확인
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        setState("mic-denied");
        return;
      }

      setState("connecting");
      setError(null);

      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: getDeviceId() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (body?.error === "already_used_today") {
          setState("daily-limit");
          return;
        }
        throw new Error("연결할 수 없습니다");
      }

      const data = await res.json();
      setSession(data);
      setEndReason(null);
      setState("connected");

      // D1: 다음 방문 시 재방문으로 인식
      localStorage.setItem("todak_has_session", "true");
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    }
  }, []);

  // D3: 세션 종료 시 페이드아웃 전환
  const endSession = useCallback((reason: EndReason) => {
    setEndReason(reason);
    setFadeOut(true);

    setTimeout(() => {
      setSession(null);
      setFadeOut(false);
      setState("ended");
    }, 3000);
  }, []);

  // D3: 페이드아웃 중에는 오브만 보여줌
  if (fadeOut && session) {
    return (
      <div className={styles.page}>
        <div className={styles.orbFadeOut} />
      </div>
    );
  }

  if (state === "connected" && session) {
    return (
      <SessionView
        token={session.token}
        url={session.url}
        onDisconnect={endSession}
      />
    );
  }

  // D1: 첫 방문 vs 재방문 레이블
  const startLabel = (() => {
    if (state === "connecting") return "연결 중";
    if (state === "daily-limit") return "내일 다시 만나자";
    if (state === "mic-denied") return "마이크를 허용해주세요";
    if (state === "error") return "다시 눌러주세요";
    if (state === "ended") {
      if (endReason === "user") return "대화를 마쳤어요";
      if (endReason === "timer") return "오늘 대화는 여기까지";
      return "연결이 종료됐어요";
    }
    return isReturning ? "다시 이야기하기" : "눌러서 시작";
  })();

  const endMessage = (() => {
    if (state !== "ended") return null;
    if (endReason === "user") return "조용히 마무리했어. 필요하면 다시 이야기하자.";
    if (endReason === "timer") return "대화가 끝났어. 오늘 감정은 여기 두고 편하게 쉬어.";
    return "연결이 끊어졌어. 다시 시작하면 이어서 이야기할 수 있어.";
  })();

  const isEnded = state === "ended";

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>토닥</h1>

      {/* D1: 첫 방문 안내 문구 */}
      {!isReturning && state === "idle" && (
        <p className={styles.subtitle}>오늘 밤, 조용히 들어줄게요</p>
      )}

      <button
        className={`${styles.startButton} ${isEnded || state === "daily-limit" ? styles.startButtonDim : ""}`}
        onClick={startSession}
        disabled={state === "connecting" || state === "daily-limit"}
        aria-label="대화 시작"
      />

      <p className={styles.startLabel}>{startLabel}</p>

      {/* 하루 1회 제한 안내 */}
      {state === "daily-limit" && (
        <p className={styles.ended}>
          오늘은 이미 대화했어. 오늘 감정은 여기 두고 편하게 쉬어.
        </p>
      )}

      {/* D2: 마이크 권한 거부 안내 */}
      {state === "mic-denied" && (
        <div className={styles.micDenied} role="alert">
          <p>대화하려면 마이크가 필요해요.</p>
          <p>브라우저 설정에서 마이크를 허용한 뒤 다시 눌러주세요.</p>
        </div>
      )}

      {endMessage && (
        <p className={styles.ended} role="status" aria-live="polite">
          {endMessage}
        </p>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function getDeviceId(): string {
  const key = "todak_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
