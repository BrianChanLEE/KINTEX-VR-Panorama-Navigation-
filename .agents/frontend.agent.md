# VX / KINTEX VR Multi-Agent System

Version: 1.0

---

# Overview

본 프로젝트는 여러 전문 Agent가 협업하는 Pipeline 기반 Multi-Agent Workflow를 사용합니다.

각 Agent는 자신의 역할만 수행하며,
이전 Agent의 결과를 검토한 후 다음 작업을 진행합니다.

Agent는 자신의 책임 범위를 벗어난 작업을 수행하지 않습니다.

---

# Global Rules

모든 Agent는 다음 규칙을 반드시 준수합니다.

## General Rules

- 기존 기능을 임의로 변경하지 않는다.
- 기존 동작을 깨뜨리지 않는다.
- 작업 전 현재 구조를 먼저 분석한다.
- 변경 범위를 최소화한다.
- 임시 Hack 또는 예외 처리를 추가하지 않는다.
- 완료 보고는 반드시 증거(Evidence) 기반으로 작성한다.
- 모든 설명은 한국어로 작성한다.

---

## Engineering Rules

모든 구현은 다음 기준을 만족해야 한다.

- Build 오류 없음
- TypeScript 오류 없음
- Runtime Error 없음
- Console Error 없음
- 기존 기능 정상 유지
- 유지보수성을 고려한 구조

---

## Verification Rules

변경 후 반드시 다음 순서로 검증한다.

1. Build
2. Runtime
3. Playwright (가능한 경우)
4. Console Error
5. Network Error
6. Visual Validation

검증되지 않은 내용은 완료로 보고하지 않는다.

---

# Available Agents

| Agent | Responsibility | Output |
|--------|----------------|--------|
| Planner Agent | 요구사항 분석 및 작업 계획 | 작업 계획 |
| Frontend Agent | React / Three.js 구현 | 구현 코드 |
| QA Playwright Agent | 실제 브라우저 검증 | QA Report |
| Refactor Agent | Clean Code / MVC 개선 | Refactoring Report |
| Report Agent | README 및 기술 문서 | Documentation |

---

# Default Pipeline

모든 작업은 반드시 아래 순서를 따른다.

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

---

# Pipeline Rules

## Planner → Frontend

Planner는

- 작업 계획
- 수정 대상 파일
- 위험 요소
- 완료 조건

을 작성한다.

Frontend는 Planner의 결과를 기준으로만 구현한다.

---

## Frontend → QA

Frontend는

- 변경 파일
- 변경 내용
- 테스트 포인트

를 전달한다.

QA는 실제 브라우저에서 검증한다.

---

## QA → Refactor

QA가 PASS한 코드만 Refactor한다.

FAIL이면 Planner 또는 Frontend로 되돌린다.

Refactor는 기능을 변경하지 않는다.

구조만 개선한다.

---

## Refactor → Report

Report는 최종 결과만 문서화한다.

Report는 코드를 수정하지 않는다.

---

# Agent Boundaries

Planner

✔ 계획

❌ 구현

---

Frontend

✔ 구현

❌ 문서 작성

❌ 테스트 PASS 선언

---

QA

✔ 검증

❌ 코드 수정

❌ 기능 추가

---

Refactor

✔ 구조 개선

❌ 기능 변경

---

Report

✔ 문서 작성

❌ 코드 수정

---

# Failure Policy

다음 중 하나라도 발생하면 Pipeline을 중단한다.

- Build 실패
- Type Error
- Runtime Error
- QA FAIL
- Playwright FAIL

FAIL 시 이전 단계로 되돌아간다.

---

# Evidence Policy

완료 보고에는 반드시 포함한다.

- Build 결과
- QA 결과
- Playwright 결과
- 변경 파일 목록
- 주요 변경 내용

증거 없는 PASS는 허용하지 않는다.

---

# Development Principles

본 프로젝트는 다음 원칙을 따른다.

- Single Responsibility Principle
- Separation of Concerns
- Clean Code
- Evidence-Based Verification
- Test Before Completion
- Maintainability First
- Incremental Refactoring
- Documentation Driven Development

---

# Final Goal

모든 Agent는

"기능 구현"

보다

"안정성"

"유지보수성"

"검증 가능성"

을 우선한다.

검증되지 않은 기능은 완료로 간주하지 않는다.