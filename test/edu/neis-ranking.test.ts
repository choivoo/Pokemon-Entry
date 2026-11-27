import {
  manualSchool,
  NEIS_REGIONS,
  neisHooks,
  parseNeisPage,
  parseNeisResponse,
  SchoolSearchError,
  searchSchools,
  shortAddress,
} from "#app/edu/neis";
import { DEFAULT_PROFILE, type LearnerProfile } from "#app/edu/profile";
import {
  aggregateClasses,
  displayName,
  fetchRanking,
  isRankingOnline,
  type RankRow,
  rankingHooks,
  withRanks,
} from "#app/edu/ranking";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const profile: LearnerProfile = {
  ...DEFAULT_PROFILE,
  subject: "math",
  grade: 6,
  semester: 2,
  school: { code: "T10:1234567", name: "테스트초등학교", region: "테스트시" },
  className: "여울반",
  studentNo: 6,
  nickname: "별이",
};

/** 실제 NEIS 학교기본정보 API 응답 모양 (2026-11 확인, 학교 이름만 가상으로 바꿈) */
const row = (office: string, code: string, name: string, region: string, addr: string) => ({
  ATPT_OFCDC_SC_CODE: office,
  ATPT_OFCDC_SC_NM: `${region}교육청`,
  SD_SCHUL_CODE: code,
  SCHUL_NM: name,
  SCHUL_KND_SC_NM: "초등학교",
  LCTN_SC_NM: region,
  ORG_RDNMA: addr,
  ORG_RDNDA: "(마바동)",
  FOND_SC_NM: "공립",
});
const NEIS_SAMPLE = {
  schoolInfo: [
    { head: [{ list_total_count: 574 }, { RESULT: { CODE: "INFO-000", MESSAGE: "정상 처리되었습니다." } }] },
    {
      row: [
        row("B10", "       ", "(가칭)새로운초등학교", "서울특별시", "서울특별시 송파구 위례서이로 10"), // 개교 전: 코드가 공백
        row("T10", "1234567", "테스트초등학교", "테스트시", "테스트시 가나구 다라로 12"),
        row("U10", "7654321", "테스트초등학교", "예시시", "예시시 사아구 자차로 3"),
      ],
    },
  ],
};

describe("학교 검색 (NEIS)", () => {
  const realFetch = neisHooks.fetch;
  afterEach(() => {
    neisHooks.fetch = realFetch;
  });

  it("응답을 학교 목록으로 바꾼다 (같은 이름은 지역·주소로 구분, 개교 전 학교는 건너뜀)", () => {
    const list = parseNeisResponse(NEIS_SAMPLE);
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({
      code: "T10:1234567",
      name: "테스트초등학교",
      region: "테스트시",
      address: "가나구 다라로 12",
    });
    expect(list[1].code).not.toBe(list[0].code);
    expect(list.every(s => !s.name.startsWith("(가칭)"))).toBe(true);
  });

  it("쪽 정보: 전체 수와 서버가 돌려준 줄 수", () => {
    const page = parseNeisPage(NEIS_SAMPLE, 3);
    expect(page).toMatchObject({ total: 574, page: 3, rows: 3 });
    expect(page.schools).toHaveLength(2);
  });

  it("결과가 없거나 이상한 응답은 빈 목록", () => {
    expect(parseNeisResponse({ RESULT: { CODE: "INFO-200", MESSAGE: "해당하는 데이터가 없습니다." } })).toEqual([]);
    expect(parseNeisResponse(null)).toEqual([]);
    expect(parseNeisResponse({ schoolInfo: [{ head: [] }] })).toEqual([]);
    expect(parseNeisPage({ RESULT: { CODE: "INFO-200" } }, 1)).toMatchObject({ total: 0, rows: 0 });
  });

  it("주소를 짧게", () => {
    expect(shortAddress("서울특별시 종로구 사직로 12 (내자동)")).toBe("종로구 사직로 12");
    expect(shortAddress(undefined)).toBe("");
  });

  it("검색 요청: 초등학교만, 이름은 인코딩, 키가 없으면 한 번에 5개", async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true, json: async () => NEIS_SAMPLE });
    neisHooks.fetch = fn;
    const page = await searchSchools(" 테스트초 ");
    expect(page.schools).toHaveLength(2);
    expect(page.total).toBe(574);
    const url = new URL(fn.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe("https://open.neis.go.kr/hub/schoolInfo");
    expect(url.searchParams.get("SCHUL_NM")).toBe("테스트초");
    expect(url.searchParams.get("SCHUL_KND_SC_NM")).toBe("초등학교");
    expect(url.searchParams.get("Type")).toBe("json");
    expect(url.searchParams.get("pSize")).toBe("5");
    expect(url.searchParams.get("pIndex")).toBe("1");
    expect(url.searchParams.has("ATPT_OFCDC_SC_CODE")).toBe(false);
    expect(url.searchParams.has("KEY")).toBe(false);
  });

  it("지역과 쪽 번호를 보낸다", async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true, json: async () => NEIS_SAMPLE });
    neisHooks.fetch = fn;
    await searchSchools("테스트초", { region: "T10", page: 3 });
    const q = new URL(fn.mock.calls[0][0] as string).searchParams;
    expect(q.get("ATPT_OFCDC_SC_CODE")).toBe("T10");
    expect(q.get("pIndex")).toBe("3");
  });

  it("지역 목록: 17개 시도, 코드가 겹치지 않는다", () => {
    expect(NEIS_REGIONS).toHaveLength(17);
    expect(new Set(NEIS_REGIONS.map(r => r[0])).size).toBe(17);
    expect(NEIS_REGIONS.find(r => r[0] === "B10")?.[1]).toBe("서울");
    expect(NEIS_REGIONS.find(r => r[0] === "T10")?.[1]).toBe("제주");
  });

  it("글자가 너무 짧으면 요청하지 않는다", async () => {
    const fn = vi.fn();
    neisHooks.fetch = fn;
    expect((await searchSchools("가")).schools).toEqual([]);
    expect(fn).not.toHaveBeenCalled();
  });

  it("서버에 연결이 안 되면 알기 쉬운 오류", async () => {
    neisHooks.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(searchSchools("테스트초")).rejects.toBeInstanceOf(SchoolSearchError);
    neisHooks.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(searchSchools("테스트초")).rejects.toThrow("응답하지");
  });

  it("직접 입력한 학교: 공백이 달라도 같은 학교로 묶인다", () => {
    expect(manualSchool(" 우리초등학교 ")).toEqual({ code: "manual:우리초등학교", name: "우리초등학교", region: "" });
    expect(manualSchool("우리 초등학교").code).toBe(manualSchool("우리초등 학교").code);
  });
});

describe("랭킹", () => {
  const real = { ...rankingHooks };
  beforeEach(() => {
    rankingHooks.url = () => "https://example.supabase.co";
    rankingHooks.key = () => "a".repeat(40);
  });
  afterEach(() => {
    Object.assign(rankingHooks, real);
    localStorage.clear();
  });

  it("서버 설정이 없으면 오프라인", () => {
    rankingHooks.url = () => "";
    expect(isRankingOnline()).toBe(false);
    rankingHooks.url = () => "http://insecure.example.com";
    expect(isRankingOnline()).toBe(false);
    rankingHooks.url = () => "https://example.supabase.co";
    expect(isRankingOnline()).toBe(true);
  });

  it("순위표 요청: 반 / 학년 / 학교 범위", async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    rankingHooks.fetch = fn;
    await fetchRanking("class", profile, "kor");
    const q1 = new URL(fn.mock.calls[0][0] as string).searchParams;
    expect(q1.get("subject")).toBe("eq.kor");
    expect(q1.get("school_code")).toBe("eq.T10:1234567");
    expect(q1.get("grade")).toBe("eq.6");
    expect(q1.get("class_name")).toBe("eq.여울반");
    expect(q1.get("order")).toBe("points.desc");
    await fetchRanking("grade", profile, "math");
    const q2 = new URL(fn.mock.calls[1][0] as string).searchParams;
    expect(q2.get("grade")).toBe("eq.6");
    expect(q2.has("class_name")).toBe(false);
    await fetchRanking("school", profile, "math");
    const q3 = new URL(fn.mock.calls[2][0] as string).searchParams;
    expect(q3.has("grade")).toBe(false);
    expect(q3.get("school_code")).toBe("eq.T10:1234567");
  });

  it("서버 오류는 예외로", async () => {
    rankingHooks.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchRanking("class", profile, "math")).rejects.toThrow("500");
  });

  const row = (uid: string, no: number, grade: number, cls: string, points: number): RankRow => ({
    uid,
    subject: "math",
    school_code: "T",
    school_name: "T",
    grade,
    class_name: cls,
    student_no: no,
    nickname: "",
    points,
    solved: 1,
    best_wave: 1,
    best_streak: 1,
  });

  it("반별 합계와 공동 순위", () => {
    const rows = [
      row("a", 1, 6, "1", 100),
      row("b", 2, 6, "1", 50),
      row("c", 1, 6, "여울반", 120),
      row("d", 2, 6, "여울반", 40),
      row("e", 3, 6, "3", 100),
    ];
    const classes = aggregateClasses(rows);
    expect(classes.map(c => [c.className, c.points, c.students])).toEqual([
      ["여울반", 160, 2],
      ["1", 150, 2],
      ["3", 100, 1],
    ]);
    const ranked = withRanks([{ points: 100 }, { points: 100 }, { points: 90 }, { points: 80 }, { points: 80 }]);
    expect(ranked.map(r => r.rank)).toEqual([1, 1, 3, 4, 4]);
  });

  it("순위표 이름은 번호와 별명", () => {
    expect(displayName({ student_no: 6, nickname: "별이" })).toBe("6번 별이");
    expect(displayName({ student_no: 6, nickname: "" })).toBe("6번");
  });
});
