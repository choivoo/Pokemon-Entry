# 수학 포켓로그 (Math PokéRogue)

[포케로그(PokéRogue)](https://github.com/pagefaultgames/pokerogue) 베타 소스에 **비례식 · 비례배분 문제**를 넣은 수학 로그라이크 게임입니다.
원본 게임의 포켓몬, 기술, 아이템, 바이옴, 트레이너, 이상한 만남, 클래식/데일리/챌린지 모드 등 **모든 시스템을 그대로** 유지하고,
층과 층 사이에 "수학 관문"만 추가했습니다.

## 게임 흐름

```
포켓몬 전투 승리 (또는 포획 · 도주)
      ↓
🔒 수학 관문 — 비례식/비례배분 문제를 풀어야 다음 층이 열림
      ↓
🔓 다음 층 개방 → 보상 아이템 선택 → 다음 포켓몬과 전투 → …
```

| 상황 | 결과 |
| --- | --- |
| 정답 | 문이 열리고 다음 층으로 진행 |
| 힌트 없이 한 번에 정답 | 보너스 머니(₽, 층이 높을수록 많이) + 연속 정답 기록 |
| 오답 | 힌트 버튼 사용 가능, **3번 틀리면 풀이를 보여주고 새 문제** 출제 |

### 문제 유형과 난이도

| 층 | 난이도 | 나오는 문제 |
| --- | --- | --- |
| 1 ~ 9층 | ★☆☆☆ | 비례식 `3 : 5 = □ : 20`, 2명 비례배분 |
| 10 ~ 29층 | ★★☆☆ | 더 큰 수의 비례식, 2명 비례배분 |
| 30 ~ 69층 | ★★★☆ | 비례식, 2명·3명 비례배분, 비와 차이 문제 |
| 70층 ~ | ★★★★ | 3명 비례배분, 비와 차이 문제 위주 |

- 문제에는 **내 파티 포켓몬 이름**과 몬스터볼·상처약 같은 게임 아이템이 등장합니다.
- 한국어 조사(이/가, 을/를, 와/과, (으)로)를 받침에 맞게 자동으로 붙입니다.
- 게임 언어가 한국어면 한국어, 그 밖의 언어는 영어로 문제가 나옵니다.
- 숫자 키패드(마우스·터치) 또는 키보드로 입력합니다. `숫자` 입력 · `Enter`/`Z` 확인 · `H` 힌트 · `Backspace` 지우기 · `Esc` 전체 지우기

## GitHub Pages 배포

이 저장소에는 `.github/workflows/deploy-pages.yml` 이 들어 있어서, `main` 브랜치에 푸시하면 자동으로 배포됩니다.

1. 저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 바꿉니다.
2. 작업 브랜치를 `main` 에 병합(또는 Actions 탭에서 워크플로를 수동 실행)합니다.
3. 몇 분 뒤 `https://<사용자명>.github.io/<저장소명>/` 에서 플레이할 수 있습니다.

배포 빌드는 **오프라인 모드**(로그인 서버 없이 브라우저에 세이브 저장)로 만들어지고, 원본 에셋(이미지·사운드 약 830MB)과 번역 파일이 함께 올라갑니다.

## 로컬에서 실행

```bash
git clone --recurse-submodules <이 저장소 주소>
cd Pokemon-Entry
# 이미 클론했다면: git submodule update --init --recursive
pnpm install
pnpm start:pages     # 오프라인 모드 개발 서버 (http://localhost:8000)
pnpm build:pages     # 배포용 빌드 → dist/
```

원본 에셋(`assets`)과 번역(`locales`)은 원본 저장소를 가리키는 git 서브모듈로 연결되어 있습니다.

## 테스트

```bash
pnpm vitest run test/math   # 수학 관문 테스트
pnpm test                    # 원본 게임 테스트 전체
```

- 원본 게임의 자동화 테스트에서는 수학 관문이 기본으로 꺼져 있습니다(문제 입력을 기다리며 멈추지 않도록).
  테스트에서 켜려면 `game.override.mathGate(true)` 를 쓰고, 게임 코드에서는 `MATH_GATE_OVERRIDE` 로 강제할 수 있습니다.

## 바뀐 파일

| 파일 | 내용 |
| --- | --- |
| `src/math/math-problems.ts` | 문제 생성기 (4가지 유형, 난이도 1~4, 정답 판정) |
| `src/math/math-text.ts` | 한국어/영어 문장·힌트·풀이, 한국어 조사 처리 |
| `src/math/math-gate-ui.ts` | 관문 화면 (게임 폰트, 애니메이션, 키보드·터치, 화면 크기 대응) |
| `src/phases/math-gate-phase.ts` | 관문 단계 (보너스, 연속 정답, 효과음) |
| `src/phases/victory-phase.ts` | 승리 후 아이템 선택 전에 관문 삽입 |
| `src/phases/new-battle-phase.ts` | 포획·도주·이상한 만남 뒤에도 관문을 거치도록 하는 안전장치 |
| `src/overrides.ts`, `test/helpers/overrides-helper.ts` | `MATH_GATE_OVERRIDE` 설정 |
| `.env.pages`, `scripts/pages/copy-assets.mjs`, `.github/workflows/deploy-pages.yml` | GitHub Pages 배포 |
| `test/math/*` | 테스트 (문제 생성·문장·화면·실제 게임 흐름) |

## 라이선스

원본 PokéRogue 와 같은 AGPL-3.0 라이선스를 따릅니다 (`LICENSE`, `LICENSES/` 참고).
포켓몬은 Nintendo / Creatures Inc. / GAME FREAK inc. 의 상표이며, 이 프로젝트는 비영리 팬 프로젝트입니다.
