# 수학 포켓로그 (Math PokéRogue)

포케로그(PokéRogue) 베타 소스에 **비례식 · 비례배분 문제**를 넣은 수학 로그라이크입니다.

## 게임 흐름
1. 포켓몬과 전투해서 승리
2. 🔒 **수학 관문** — 비례식/비례배분 문제를 풀어야 다음 층이 열림
3. 정답 → **다음 층 개방** → 보상 아이템 선택
4. 다음 포켓몬과 전투 … (기본 포케로그 흐름 그대로)

- 오답: 힌트 버튼 사용 가능, 3번 틀리면 풀이를 보여주고 새 문제 출제
- 힌트 없이 한 번에 정답: 보너스 머니
- 난이도는 층이 올라갈수록 상승: 비례식 → 2분할 비례배분 → 3분할 → 비와 차가 주어진 문제

## 실행
```bash
./setup-assets.sh        # 원본 에셋(약 830MB) 다운로드
pnpm install
pnpm start:dev           # 개발 서버
```

## 변경된 파일
- `src/math/math-problems.ts` — 문제 생성기 (4가지 유형, 난이도 1~4)
- `src/phases/math-gate-phase.ts` — 수학 관문 단계 (오버레이 UI)
- `src/phases/victory-phase.ts` — 승리 후 `MathGatePhase` 삽입
- `src/phase-manager.ts` — 단계 등록
- `test/math/*` — 테스트

원본 라이선스(AGPL-3.0 등)는 `LICENSE`를 따릅니다.
