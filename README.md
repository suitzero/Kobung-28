# KobungApp

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.0.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.


## 꼬붕28호 Roadmap (2026-08 재가동)

멀티에이전트 시스템을 단순한 "에이전트 여러 개 붙인 데모" 수준에서 **"신뢰할 수 있고 확장 가능한 에이전트 그래프(Reliable Agent Graph)"**로 끌어올리는 것이 이번 사이클의 핵심 목표입니다.
방향성은 최근 업계 표준 및 트렌드(Graph-based orchestration, MCP/A2A 표준화, Human-in-the-loop)를 엄격히 따릅니다.

### Phase 0 — 재가동 정비 (Reactivation & Cleanup)
- [ ] **현재 코드베이스 인벤토리:** 살아있는 에이전트 / 죽은 코드 / 의존성 패키지 전면 정리 및 최신화
- [ ] **빌드·실행 경로 복구:** 파이프라인(CI/CD) 점검 및 최소 스모크 테스트(Smoke Test) 1개 이상 통과
- [ ] **기존 아키텍처 문서화:** 현재 구조를 그래프 다이어그램 1장으로 문서화 (노드 = 에이전트, 엣지 = Handoff)

### Phase 1 — Node Contracts (에이전트 규약)
- [ ] **에이전트별 책임 명세 (Contract):** 입력/출력 스키마 정의 및 에이전트가 "틀려도 되는(허용되는) 범위" 명시
- [ ] **Confidence 필드 도입:** 에이전트 출력에 신뢰도(Confidence) 필드를 추가하여 사실(Fact)과 가설(Hypothesis)을 명확히 구분
- [ ] **에이전트 단위 테스트 (Unit Test):** 동일 입력 반복 실행 시 출력 변동성(결정론적 동작 여부) 측정 및 모니터링

### Phase 2 — Edge Semantics (Context Handoff)
- [ ] **Handoff 컨텍스트 정책 정의:** 에이전트 간 전환 시 전체 대화(Full Transcript) vs 구조화된 요약 vs 참조 포인터 중 적절한 전달 방식 확립
- [ ] **Token 예산 (Budget) 관리:** 엣지(Edge)별 최대 토큰 예산 설정 및 초과 시 컨텍스트 압축/가지치기 전략 구현
- [ ] **Handoff 로깅 (Traceability):** 어느 엣지에서 어떤 컨텍스트가 누락/압축되었는지 완벽하게 추적할 수 있도록 로깅 강화

### Phase 3 — Trust & Verification (신뢰와 검증)
- [ ] **Verifier Node 도입:** 다른 에이전트의 가설을 사실로 승격시키는(혹은 기각하는) '검증 전용 에이전트' 배치
- [ ] **의견 충돌 해결 (Resolution) 규칙:** 에이전트 간 의견 충돌 시 재검증 루프를 돌리거나 상위(Human)로 에스컬레이션하는 명확한 기준 확립
- [ ] **실행 권한 분리 (Least Privilege):** 조사/분석 에이전트와 실제 액션을 수행하는(API 호출 등) 에이전트의 Credential 및 권한 분리
- [ ] **위험 액션 전 Human Approval Gate:** 시스템 변경, 결제 등 위험 작업 전 최소한의 승인 UI (CLI 프롬프트 또는 단순 버튼) 도입

### Phase 4 — State, Budget, Termination (상태와 종료 조건)
- [ ] **공유 상태 저장소 (Shared State) 설계:** 어떤 데이터를 영속성(Persist) 있게 관리할지 결정하고, Write 권한을 가진 에이전트 지정
- [ ] **루프/실행 예산 설정:** Max Iterations, Max Tokens, Wall-clock Timeout 등 무한 루프 방지를 위한 하드 리밋(Hard Limit) 설정
- [ ] **예산 초과 시 Escalation Path 정의:** 조용히 멈추는 것(Silent Stall)을 금지하고, 반드시 사용자에게 알리거나 Fallback 로직 실행

### Phase 5 — Observability & Interop (관측성과 상호운용성)
- [ ] **Reasoning Trace 시각화:** 어떤 에이전트가 어떤 컨텍스트를 바탕으로 어떤 결정을 내렸는지 100% 재생(Replay) 가능한 로그 구축
- [ ] **툴 연결 표준화 (MCP):** Model Context Protocol(MCP) 기반으로 도구(Tool) 및 리소스 연결 방식 정리
- [ ] **(선택) A2A 호환성 검토:** 외부 시스템/에이전트와의 상호운용(Agent-to-Agent)을 위한 표준 인터페이스 검토

### Phase 6 — North Star: Self-Organizing Graph (스스로 진화하는 에이전트 조직)
> **비전:** "그래프를 사람이 그리는 시대의 다음: 그래프가 트레이스를 보고 스스로 조직(Topology)을 개선한다."
- [ ] **에이전트 평판 스코어링:** 과거 판단 적중률 데이터를 축적하여, 이후 라우팅 및 신뢰도 가중치로 활용
- [ ] **트레이스 기반 Topology 개선 제안:** "이 Verifier는 항상 통과만 시킴 → 제거 제안", "두 에이전트 상습 충돌 → 중재 노드 삽입 제안" 등 시스템 자가 진단
- [ ] **Human Approval for Topology Changes:** 토폴로지 변경은 시스템이 제안까지만 자동화하며, 실제 조직 개편(적용)은 반드시 Human 승인 게이트를 거침
- [ ] **인간 역할의 전환 (Paradigm Shift):** 개별 액션 승인자에서 시스템의 헌법(불변 정책) 작성자이자 전체 감사자(Auditor)로 역할 승격
- [ ] **시스템 통제선 (Red Line) 설정:** AI가 절대 넘을 수 없는 선을 정책 레이어로 분리하고, Self-modification 대상에서 원천 배제

### 운영 원칙 (Core Operating Principles)
- **모든 루프에는 탈출 조건이 있다.** (무한 루프 절대 금지)
- **모든 승인 게이트는 실제 리스크를 막아야 한다.** (형식적이고 습관적인 승인 프로세스 지양)
- **"AI가 자신 있게 틀렸을 때 무슨 일이 생기는가(Fail-safe)"에 명확히 답할 수 있어야 한다.**
