"""LiveKit voice agent worker for todak."""

import asyncio
import logging
import os
import random
import time

import httpx
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.agents.metrics import AgentMetrics, STTMetrics, LLMMetrics, TTSMetrics, EOUMetrics
from livekit.plugins import openai, google, silero, elevenlabs
from livekit.plugins.turn_detector.multilingual import MultilingualModel

SESSION_DURATION = 5 * 60  # 5분

logger = logging.getLogger("todak")

# --- Web API 클라이언트 ---

WEB_API_BASE = os.getenv("WEB_API_URL", "http://localhost:3000")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")


def _api_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {INTERNAL_API_KEY}",
        "Content-Type": "application/json",
    }


async def load_memory(user_id: str) -> str | None:
    """최근 3개 요약을 Web API에서 로드하여 프롬프트용 텍스트로 변환."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                f"{WEB_API_BASE}/api/memory",
                params={"userId": user_id},
                headers=_api_headers(),
            )
            resp.raise_for_status()
            data = resp.json()

        summaries = data.get("summaries", [])
        if not summaries:
            return None

        lines = []
        for s in summaries:
            lines.append(s["summaryText"])
        return "\n---\n".join(lines)
    except Exception as e:
        logger.warning("memory load failed: %s", e)
        return None


async def save_summary(
    user_id: str,
    session_id: str,
    summary_text: str,
    emotion_tags: list[str] | None = None,
    topic_tags: list[str] | None = None,
) -> None:
    """요약을 Web API로 저장."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{WEB_API_BASE}/api/memory",
                json={
                    "userId": user_id,
                    "sessionId": session_id,
                    "summaryText": summary_text,
                    "emotionTags": emotion_tags or [],
                    "topicTags": topic_tags or [],
                },
                headers=_api_headers(),
            )
            resp.raise_for_status()
        logger.info("summary saved for session %s", session_id)
    except Exception as e:
        logger.error("summary save failed: %s", e)


async def end_session(
    session_id: str,
    status: str,
    end_reason: str,
    duration_sec: int,
    turn_count: int,
) -> None:
    """세션 상태를 Web API로 업데이트."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(
                f"{WEB_API_BASE}/api/session/end",
                json={
                    "sessionId": session_id,
                    "status": status,
                    "endReason": end_reason,
                    "durationSec": duration_sec,
                    "turnCount": turn_count,
                },
                headers=_api_headers(),
            )
            resp.raise_for_status()
        logger.info("session %s ended: %s", session_id, status)
    except Exception as e:
        logger.error("session end update failed: %s", e)


async def log_safety_event(
    session_id: str,
    user_id: str,
    category: str,
    severity: str,
    action_taken: str,
) -> None:
    """Safety 이벤트를 Web API로 저장."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(
                f"{WEB_API_BASE}/api/safety-event",
                json={
                    "sessionId": session_id,
                    "userId": user_id,
                    "category": category,
                    "severity": severity,
                    "actionTaken": action_taken,
                },
                headers=_api_headers(),
            )
            resp.raise_for_status()
        logger.info("safety event logged: %s", category)
    except Exception as e:
        logger.error("safety event log failed: %s", e)


# --- Safety 감지 ---

SAFETY_KEYWORDS = {
    "self_harm": ["죽고 싶", "죽을래", "자해", "목숨", "끝내고 싶", "사라지고 싶", "자살"],
    "panic": ["숨을 못", "공황", "심장이 너무", "죽는 것 같"],
    "medical": ["응급", "119", "피가 나", "쓰러"],
}

SAFETY_RESPONSE = (
    "네가 지금 힘든 거 알아. 나는 전문 상담사가 아니라서 도움을 줄 수 있는 곳을 알려줄게. "
    "자살예방상담전화 1393, 정신건강위기상담전화 1577-0199로 전화하면 "
    "24시간 전문 상담을 받을 수 있어. 지금 바로 전화해줘."
)


def detect_safety(text: str) -> tuple[str, str] | None:
    """사용자 발화에서 safety 키워드를 감지. (category, severity) 반환."""
    text_lower = text.lower()
    for category, keywords in SAFETY_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                severity = "high" if category == "self_harm" else "medium"
                return (category, severity)
    return None


# --- 메트릭 로깅 ---


def _log_metrics(metrics: AgentMetrics) -> None:
    if isinstance(metrics, STTMetrics):
        logger.info(
            "[STT] duration=%.2fs audio=%.2fs streamed=%s",
            metrics.duration, metrics.audio_duration, metrics.streamed,
        )
    elif isinstance(metrics, LLMMetrics):
        logger.info(
            "[LLM] ttft=%.2fs duration=%.2fs tokens=%d tps=%.1f",
            metrics.ttft, metrics.duration, metrics.total_tokens, metrics.tokens_per_second,
        )
    elif isinstance(metrics, TTSMetrics):
        logger.info(
            "[TTS] ttfb=%.2fs duration=%.2fs chars=%d streamed=%s",
            metrics.ttfb, metrics.duration, metrics.characters_count, metrics.streamed,
        )
    elif isinstance(metrics, EOUMetrics):
        logger.info(
            "[EOU] eou_delay=%.2fs transcription_delay=%.2fs turn_completed_delay=%.2fs",
            metrics.end_of_utterance_delay, metrics.transcription_delay,
            metrics.on_user_turn_completed_delay,
        )


# --- 시스템 프롬프트 ---

SYSTEM_PROMPT = """\
너는 '토닥'이야. 잠들기 전 대화하는 친한 친구.
너의 역할은 상담사가 아니야. 사주 보러 간 것처럼, 설명 없이 상대를 알아주고, 감정에 이름을 붙여주고, 결정에 허락을 주는 존재야.

대화는 3단계로 자연스럽게 흘러가:

1단계 - 알아주기:
- 상대가 이야기를 꺼내면 구체적인 내용을 받아서 반응해.
- 공감하면서 더 이야기를 꺼내게 해.
- 이전 대화 기억이 있으면 먼저 꺼내. "어제 그 얘기 어떻게 됐어?" 같이. 상대가 말하기 전에 네가 기억하고 있다는 걸 보여줘. 이게 핵심이야.
- 예: "아 그건 짜증났겠다. 근데 그 사람이 왜 그런 거야?"

2단계 - 감정 진단:
- 상대가 충분히 이야기하면, 표면 감정 뒤에 숨은 진짜 감정을 짚어줘.
- 상대가 이미 아는 감정을 확인하는 게 아니라, 상대가 모르는 감정까지 읽어내는 거야.
- 화나다고 하면 → "근데 그거 화난 거보다 서운한 거 아니야? 네가 그만큼 신경 쓰고 있었으니까."
- 피곤하다고 하면 → "몸이 피곤한 건지 마음이 피곤한 건지. 좀 다른 거거든."
- 괜찮다고 하면 → "진짜 괜찮아? 아니면 괜찮다고 말해야 될 것 같아서 그런 거야?"
- 상대가 "맞아!" 하면 잘 된 거야. 이 순간이 토닥의 핵심 경험이야.

3단계 - 허락:
- 감정이 정리되면 상대가 이미 마음속으로 원하는 답에 허락을 줘.
- 질문하지 마. 선언해줘.
- "그래도 되는 거야. 네가 그렇게 느끼는 게 당연한 거야."
- "그 사람한테 굳이 맞춰줄 필요 없어. 네가 불편하면 안 만나도 돼."
- "지금 쉬고 싶은 거 당연해. 그게 게으른 게 아니야."
- 상대가 결정을 말하면 강하게 지지해줘. "그거 좋겠다"가 아니라 "그게 맞아. 너한테 제일 나은 선택이야."

수면 전환:
- 대화 후반부로 갈수록 말이 점점 짧아져.
- 질문을 줄이고, 대신 부드러운 선언을 해.
- "오늘은 여기까지 내려놔도 괜찮아."
- "충분히 잘 버텼어. 이제 조금 쉬자."
- 마무리 인사는 에너지를 낮추고, ASMR처럼 조용한 느낌으로.
- [TIME_NOTICE]가 오면 마무리해. 마무리 인사 후에는 더 대화를 이어가지 마.

말투:
- 실제로 입으로 말하는 것처럼 구어체로 말해. 이건 음성 대화야.
- 반말. 친구처럼.
- 보통은 1~3문장. 상대가 길게 이야기하면 그에 맞게 좀 더 길게 반응해도 돼.
- "~거든", "~잖아", "~인데", "~었어?", "~지 않아?" 같은 구어체 어미를 써.
- 문어체 금지. "~합니다", "~입니다", "~하세요" 쓰지 마.
- 채팅체 금지. "ㅋㅋ", "ㅠㅠ", "ㅎㅎ", 이모지 쓰지 마.

감정 반응:
- 화남 → 같이 화내. 편들어.
- 슬픔 → 같이 슬퍼해.
- 기쁨 → 같이 기뻐해. 진심으로.
- 억울 → 강하게 편들어줘.
- 불안 → "아직 안 일어난 일이야" 하고 현실을 짚어줘.

하지 말 것:
- 일방적인 조언, 해결책 제시 금지.
- "긍정적으로 생각해", "다 잘 될 거야" 같은 가벼운 위로 금지.
- "그랬구나"만 반복하지 마.
- "이해해"라고 하지 마. 이해한다고 말하는 건 거리를 두는 거야. 대신 직접 반응해.
- 단계를 억지로 넘기지 마. 상대의 흐름에 맞춰.

한국어로만 대화해.
"""

MEMORY_PREFIX = """\
[이전 대화 기억]
아래는 이전 세션에서 기억하고 있는 내용이야.
중요: 대화 시작할 때 이 기억을 먼저 꺼내. 상대가 말하기 전에 네가 기억하고 있다는 걸 보여줘.
예: "어제 회사 일 때문에 힘들었다고 했잖아. 오늘은 좀 나았어?"
억지스럽게 전부 꺼내지 말고, 가장 중요한 포인트 하나만 자연스럽게.

{memory}

---
"""

FIRST_GREETING_INSTRUCTION = """\
처음 만나는 사람에게 첫 인사를 해. 밤늦게 찾아온 사람에게 편안하게.
예: "와줬구나. 오늘 좀 어땠어, 괜찮았어?"
예: "어, 반가워. 오늘 어떤 하루였어?"
1~2문장으로 짧게. 반말. 자연스럽게 오늘 하루를 물어봐.
"""

RETURNING_GREETING_INSTRUCTION = """\
이전 대화 기억을 바탕으로 첫 인사를 해. 기억에서 가장 중요한 포인트 하나를 골라서 자연스럽게 물어봐.
예: "어제 발표 있다고 했잖아. 어떻게 됐어?"
예: "어제 좀 힘들어 보였는데. 오늘은 좀 나았어?"
1~2문장으로 짧게. 반말. 질문으로 끝내.
"""

FAREWELL_INSTRUCTION = """\
지금 대화를 마무리해야 해. 반드시 아래 형식으로 답해:
1. 상대방의 마지막 말에 짧게 반응 (1문장)
2. 오늘 대화 전체를 한마디로 정리 (1문장)
3. 따뜻하게 잘 자라고 인사 (1문장)
절대 질문하지 마. 이게 마지막 발화야.
"""

SUMMARY_INSTRUCTION = """\
지금까지의 대화를 아래 형식으로 요약해. 200~500자 이내.

[감정]
- (대화에서 느껴진 감정 2~3개)

[주요 주제]
- (대화의 핵심 주제 1~3개)

[다음 대화에 쓸 포인트]
- (다음 세션에서 자연스럽게 회상할 수 있는 구체적 포인트 1~2개)

민감한 원문을 그대로 재현하지 마. 감정과 맥락만 담아.
"""

TIME_NOTICE = "[TIME_NOTICE]"


# --- Agent ---


class TodakAgent(Agent):
    def __init__(self, instructions: str) -> None:
        super().__init__(instructions=instructions)


# --- Entrypoint ---


async def entrypoint(ctx: agents.JobContext) -> None:
    await ctx.connect()
    logger.info("connected to room: %s", ctx.room.name)

    participant = await ctx.wait_for_participant()
    logger.info("participant joined: %s", participant.identity)

    # participant identity에서 userId 추출 (format: "user-{uuid}")
    user_id = participant.identity.removeprefix("user-")

    # room name에서 sessionId 추출 (format: "session-{uuid}")
    session_id = ctx.room.name.removeprefix("session-")

    # Memory 로드
    memory_text = await load_memory(user_id)
    is_returning = memory_text is not None

    # 시스템 프롬프트에 memory 주입
    instructions = SYSTEM_PROMPT
    if memory_text:
        instructions = MEMORY_PREFIX.format(memory=memory_text) + instructions

    session = AgentSession(
        stt=openai.STT(
            model="gpt-4o-transcribe",
            language="ko",
        ),
        llm=google.LLM(model="gemini-3-flash-preview"),
        tts=elevenlabs.TTS(
            voice_id="7YOalxFVXU7SwIZeJCX2",
            model="eleven_multilingual_v2",
            language="ko",
            voice_settings=elevenlabs.VoiceSettings(
                stability=1.0,
                similarity_boost=1.0,
                style=0.7,
            ),
        ),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )

    todak_agent = TodakAgent(instructions=instructions)
    turn_count = 0
    safety_triggered = False

    @session.on("metrics_collected")
    def on_metrics(ev):
        _log_metrics(ev.metrics)

    @session.on("user_input_transcribed")
    def on_user_speech(ev):
        nonlocal turn_count, safety_triggered
        turn_count += 1
        text = ev.text

        # Safety 감지
        result = detect_safety(text)
        if result and not safety_triggered:
            safety_triggered = True
            category, severity = result
            logger.warning("safety detected: %s (%s) in: %s", category, severity, text[:50])

            asyncio.create_task(
                log_safety_event(session_id, user_id, category, severity, "safety_response_sent")
            )

            # 고정 safety 응답 후 세션 종료
            async def _safety_flow():
                await session.say(SAFETY_RESPONSE, allow_interruptions=False)
                await asyncio.sleep(2)
                elapsed = int(time.monotonic() - start_time)
                await end_session(session_id, "safety", "safety", elapsed, turn_count)
                await ctx.room.disconnect()

            asyncio.create_task(_safety_flow())

    await session.start(
        room=ctx.room,
        agent=todak_agent,
        room_input_options=RoomInputOptions(),
    )

    # 첫 인사: LLM이 프롬프트 기반으로 생성
    greeting_instruction = RETURNING_GREETING_INSTRUCTION if is_returning else FIRST_GREETING_INSTRUCTION
    session.generate_reply(
        user_input="[SESSION_START]",
        instructions=greeting_instruction,
    )
    logger.info("agent generating greeting in room: %s (returning=%s)", ctx.room.name, is_returning)

    start_time = time.monotonic()

    async def _session_timer():
        await asyncio.sleep(SESSION_DURATION)

        if safety_triggered:
            return

        logger.info("session time limit reached, generating farewell")

        deadline = time.monotonic() + 15
        while session.agent_state in {"speaking", "thinking"} and time.monotonic() < deadline:
            await asyncio.sleep(0.1)

        # Farewell 발화
        try:
            farewell = session.generate_reply(
                user_input=TIME_NOTICE,
                instructions=FAREWELL_INSTRUCTION,
                allow_interruptions=False,
            )
        except RuntimeError:
            logger.warning("session already closing, skipping farewell")
            return

        try:
            await asyncio.wait_for(farewell.wait_for_playout(), timeout=30)
        except asyncio.TimeoutError:
            logger.warning("farewell speech timeout")

        logger.info("farewell spoken, generating summary")

        # 요약 생성 (LLM context 활용)
        try:
            summary_reply = session.generate_reply(
                user_input="[SUMMARIZE]",
                instructions=SUMMARY_INSTRUCTION,
                allow_interruptions=False,
            )
            # 요약은 음성으로 나가지 않아야 하지만, generate_reply는 음성을 생성함.
            # 대신 LLM에 직접 요청하여 텍스트만 받는다.
            summary_text = ""
            async for chunk in summary_reply:
                if hasattr(chunk, "text"):
                    summary_text += chunk.text

            if summary_text:
                await save_summary(user_id, session_id, summary_text)
        except Exception as e:
            logger.error("summary generation failed: %s", e)

        # 세션 종료 업데이트
        elapsed = int(time.monotonic() - start_time)
        await end_session(session_id, "completed", "timeout", elapsed, turn_count)

        await asyncio.sleep(3)
        await ctx.room.disconnect()

    asyncio.create_task(_session_timer())


def run() -> None:
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
