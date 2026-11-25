# 포켓몬: 피카츄와 관동의 길 (엔트리 팬 RPG)

엔트리용 2D 컬러 탑다운 RPG. 피카츄와 관동을 여행해 배지 8개를 모으고, 로켓단 본부 작전을 막고, 리그 챔피언을 이기면 엔딩이 나온다.

## 파일
- `build/Pokemon_Pikachu_Kanto_Journey_1.0.ent` — 배포용 프로젝트 (엔트리에서 `불러오기`).
- `build/M0_verify.ent` — M0 기술 검증용 작은 프로젝트.
- `docs/` — `PLAY.md`(조작), `DATA.md`(데이터 목록), `SOURCES.md`(출처), `QA_REPORT.md`(테스트·시간표·제약), `STATUS.md`(인수인계).
- `tools/`, `engine/`, `tests/` — 생성기, 검증용 기준 엔진, 테스트. 재생성: `python3 tools/build_world.py && python3 tools/make_assets.py && python3 tools/assemble.py`.

**중요:** 이 환경에는 엔트리 편집기가 없어 `.ent`를 실제 엔트리에서 열어보지 못했다. 자세한 검증 범위는 `docs/QA_REPORT.md`.
