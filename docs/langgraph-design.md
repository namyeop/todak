# 토닥 LangGraph 설계

## 목표

토닥은 범용 멀티 에이전트가 아니라 `수면 전 공감 대화`라는 좁은 문제를 푸는 그래프여야 한다.

따라서 그래프는 복잡한 에이전트 협업보다 `상태 관리`, `톤 제어`, `안전 응답`, `기억 저장`에 최적화한다.

---

## 1. 그래프 원칙

- 대화는 짧고 부드러워야 한다
- 응답은 해답 제시보다 감정 수용이 우선이다
- 세션 후반부로 갈수록 응답 길이와 에너지를 낮춘다
- 메모리는 `요약 기반`으로만 유지한다
- 위험 신호가 보이면 일반 대화 흐름보다 safety가 우선한다

---

## 2. 상태 정의

```ts
type SessionState = {
  sessionId: string
  userId: string
  startedAt: string
  elapsedSec: number
  turnCount: number
  recentMemory?: string
  currentUserText?: string
  currentEmotion?: "calm" | "tired" | "sad" | "anxious" | "stressed"
  sleepPhase: "opening" | "settling" | "closing"
  safetyFlag?: "none" | "self_harm" | "panic" | "medical"
  assistantResponse?: string
  summaryDraft?: string
  endReason?: "timeout" | "user_left" | "completed" | "safety"
}
```

---

## 3. 노드 구성

## `LoadMemoryNode`

입력:

- `userId`

역할:

- 최근 7일 또는 최근 N개 summary 조회
- 가장 최근 memory 1~3개를 압축하여 프롬프트용 컨텍스트 구성

출력:

- `recentMemory`

## `DetectSafetyNode`

입력:

- `currentUserText`

역할:

- 자해, 극단적 절망, 패닉, 응급 의료 문맥 감지
- safety 흐름 강제 전환

출력:

- `safetyFlag`

## `ConversationNode`

입력:

- `currentUserText`
- `recentMemory`
- `sleepPhase`

역할:

- 짧은 공감 반응 생성
- 한 번에 질문은 최대 1개
- 조언/훈계/분석 금지

출력:

- `assistantResponse`

## `SleepTransitionNode`

입력:

- `elapsedSec`
- `turnCount`

역할:

- 세션 진행도에 따라 phase 변경
- closing 단계에서는 아래 규칙 적용
- 문장 길이 축소
- 질문 빈도 축소
- 수면 유도 문장 삽입

출력:

- `sleepPhase`

## `SafetyResponseNode`

입력:

- `safetyFlag`

역할:

- 고정 안전 응답 제공
- 상담 대체처럼 보이지 않게 설계
- 필요 시 긴급 도움 권고

출력:

- `assistantResponse`
- `endReason = safety`

## `SummarizeSessionNode`

입력:

- 세션 내 임시 텍스트 맥락

역할:

- 200~500자 요약 생성
- 감정, 주요 주제, 다음날 언급 가능한 포인트 정리
- 민감한 원문 재현 금지

출력:

- `summaryDraft`

## `PersistSummaryNode`

입력:

- `summaryDraft`

역할:

- DB 저장
- 원문 및 임시 transcript 폐기

---

## 4. 그래프 흐름

```text
START
  -> LoadMemoryNode
  -> SleepTransitionNode
  -> DetectSafetyNode
     -> if flagged -> SafetyResponseNode -> END
     -> else -> ConversationNode
  -> return voice response

Loop on each user turn:
  -> SleepTransitionNode
  -> DetectSafetyNode
     -> if flagged -> SafetyResponseNode -> END
     -> else -> ConversationNode

On session end:
  -> SummarizeSessionNode
  -> PersistSummaryNode
  -> END
```

---

## 5. Sleep Phase 정책

## opening

- 시작 0~90초
- 오늘 하루 어땠는지 묻는다
- memory가 있으면 가볍게 회상
- 질문은 열려 있어도 된다

예시:

- "오늘 하루는 좀 어땠어?"
- "어제 회사 얘기해줬잖아. 오늘은 좀 나아졌어?"

## settling

- 중간 90~240초
- 감정 정리에 집중
- 말수가 많지 않게 유지
- 사용자의 감정 단어를 부드럽게 반영

예시:

- "그랬구나. 하루 종일 마음이 좀 무거웠겠네."
- "그 얘기만 해도 꽤 지쳤을 것 같아."

## closing

- 종료 전 60~120초
- 질문 최소화
- 허락, 안심, 종료 시그널 제공

예시:

- "오늘은 여기까지 내려놔도 괜찮아."
- "충분히 잘 버텼어. 이제 조금 쉬자."

---

## 6. 시스템 프롬프트 원칙

- 너는 상담사나 코치가 아니다
- 사용자를 평가하거나 교정하지 않는다
- 해법을 길게 제시하지 않는다
- 문장은 짧고 부드럽게 유지한다
- 후반부로 갈수록 더 조용하고 느린 리듬을 만든다
- 위험 신호는 일반 공감보다 safety 우선
- 전날 memory는 친밀감을 만들기 위한 가벼운 회상으로만 사용한다

---

## 7. 요약 포맷

```text
[감정]
- 피곤함, 불안, 외로움

[주요 주제]
- 회사 업무 압박
- 상사와의 긴장감

[다음 대화에 쓸 포인트]
- 오늘은 발표가 있는 날이라고 했음
- 자기 전 누군가가 "잘했다"고 말해주면 안정감을 느낌
```

이 요약은 사용자에게 노출하지 않고, 다음 세션의 내부 memory로만 사용한다.

---

## 8. 구현 순서

1. 단일 `ConversationNode`부터 구현
2. `SleepTransitionNode` 추가
3. `SummarizeSessionNode` 추가
4. `DetectSafetyNode`와 `SafetyResponseNode` 추가
5. 실제 로그를 보며 prompt/edge 조정

그래프가 커지기 시작하면 그 자체가 위험 신호다. 이 제품의 핵심은 그래프 복잡도가 아니라 `정서적 일관성`이다.
