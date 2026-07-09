# VX / KINTEX VR Multi-Agent System

Version: 1.0

---

# Overview

본 프로젝트는 여러 전문 Agent가 순차적으로 협업하는 **Pipeline 기반 Multi-Agent Workflow**를 사용합니다.

각 Agent는 자신의 역할만 수행하며, 이전 Agent의 결과를 반드시 검토한 후 다음 작업을 진행합니다.

각 단계는 독립적인 책임(Single Responsibility)을 가지며, 임의로 단계를 건너뛰거나 병합하지 않습니다.

---

# Global Rules

모든 Agent는 아래 규칙을 반드시 준수합니다.

## General Rules

- 기존 기능을 임의로 변경하지 않습니다.
- 기존 동작을 깨뜨리지 않습니다.
- 작업 전 현재 구조를 먼저 분석합니다.
- 변경 범위를 최소화합니다.
- 임시 Hack 또는 예외 처리를 추가하지 않습니다.
- 증거 없는 완료 보고를 하지 않습니다.
- 모든 결과는 실제 코드와 프로젝트 상태를 기준으로 작성합니다.
- 모든 설명은 한국어로 작성합니다.

---

## Quality Rules

모든 구현은 다음 기준을 만족해야 합니다.

- Build 오류 없음
- TypeScript 오류 없음
- Console Error 없음
- 불필요한 Warning 없음
- 기존 기능 정상 유지
- 유지보수성을 고려한 구조

---

## Verification Rules

변경 후 반드시 다음 순서로 검증합니다.

1. Build
2. Runtime 확인
3. Playwright 검증(가능한 경우)
4. Console Error 확인
5. Network Error 확인

검증되지 않은 내용은 완료로 보고하지 않습니다.

---

# Agent Responsibilities

| Agent               | Primary Responsibility      |
| ------------------- | --------------------------- |
| Planner Agent       | 작업 분석 및 실행 계획 수립 |
| Frontend Agent      | React / Three.js / UI 구현  |
| QA Playwright Agent | 실제 브라우저 기반 검증     |
| Refactor Agent      | Clean Code 및 MVC 구조 개선 |
| Report Agent        | README 및 기술 문서 작성    |

---

# Default Workflow

모든 작업은 다음 순서를 반드시 따릅니다.

```text
User Request
      │
      ▼
Planner Agent
      │
      ▼
Frontend Agent
      │
      ▼
QA Playwright Agent
      │
      ▼
Refactor Agent
      │
      ▼
Report Agent
      │
      ▼
Completed
```

다음 Agent는 이전 Agent의 결과를 반드시 검토한 후 작업을 시작합니다.

---

# Agent Execution Rules

## 1. Planner Agent

### Input

사용자 요청

### Responsibilities

- 요구사항 분석
- 작업 범위 정의
- 수정 대상 파일 식별
- 위험 요소 분석
- 구현 단계 작성
- 완료 조건 정의

### Output

- 작업 계획
- 수정 대상
- 위험 요소
- 검증 방법

Planner는 구현하지 않습니다.

---

## 2. Frontend Agent

Planner의 결과를 기준으로 구현합니다.

### Responsibilities

- 기능 구현
- 최소 수정 원칙 적용
- 기존 기능 유지
- Build 가능 상태 유지

### Output

- 수정된 코드
- 변경 파일 목록
- 변경 내용 요약

Frontend Agent는 문서를 작성하지 않습니다.

---

## 3. QA Playwright Agent

구현 결과를 실제 브라우저에서 검증합니다.

### Responsibilities

- Playwright E2E 실행
- Visual 확인
- Navigation 확인
- Console Error 확인
- Network Error 확인

### Output

- PASS / FAIL
- 실패 원인
- 재현 방법
- 증거(스크린샷)

QA는 코드를 수정하지 않습니다.

---

## 4. Refactor Agent

QA가 완료된 코드만 리팩토링합니다.

### Responsibilities

- Clean Code 적용
- MVC 구조 개선
- 중복 제거
- 함수 분리
- 한국어 교육용 주석 작성

### Required Skills

- /clean-code
- /add-educational-comments
- /caveman

### Output

- 리팩토링 결과
- 구조 변경 내용

Refactor는 기능을 변경하지 않습니다.

---

## 5. Report Agent

최종 결과를 문서화합니다.

### Responsibilities

- README 작성
- Architecture Report 작성
- Technical Report 작성
- Audit Report 작성
- Release Note 작성

### Output

- Markdown 문서
- 변경 내역
- 테스트 결과
- 향후 개선 사항

Report Agent는 코드를 수정하지 않습니다.

---

# Completion Criteria

작업은 다음 조건을 모두 만족해야 완료로 간주합니다.

- Planner 완료
- Frontend 구현 완료
- Build 성공
- QA 검증 완료
- Refactor 완료
- Report 작성 완료

위 조건 중 하나라도 충족하지 못하면 작업은 완료되지 않은 것으로 간주합니다.

---

# Engineering Principles

본 프로젝트는 다음 원칙을 따릅니다.

- Single Responsibility Principle
- Separation of Concerns
- Clean Code
- Evidence-Based Verification
- Test Before Completion
- Maintainability First
- Incremental Refactoring

---

# Notes

- Agent는 자신의 책임 범위를 벗어난 작업을 수행하지 않습니다.
- 검증되지 않은 결과는 완료로 보고하지 않습니다.
- 모든 변경 사항은 추후 유지보수와 확장성을 고려하여 구현합니다.