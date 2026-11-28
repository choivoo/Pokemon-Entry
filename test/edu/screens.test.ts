import { DEFAULT_PROFILE, type LearnerProfile, type School } from "#app/edu/profile";
import type { RankRow } from "#app/edu/ranking";
import { RANKING_OVERLAY_ID, showRanking } from "#app/edu/ranking-ui";
import { SETUP_OVERLAY_ID, showSetup } from "#app/edu/setup-ui";
import { emptyAllStats, getUid } from "#app/edu/stats";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sel = (id: string, s: string) => document.querySelector(`#${id} ${s}`) as HTMLElement;
const all = (id: string, s: string) => Array.from(document.querySelectorAll<HTMLElement>(`#${id} ${s}`));
const setup = (s: string) => sel(SETUP_OVERLAY_ID, s);
const clickText = (id: string, text: string) =>
  all(id, "button")
    .find(b => b.textContent?.trim().startsWith(text))!
    .click();
const type = (input: HTMLInputElement, v: string) => {
  input.value = v;
  input.dispatchEvent(new Event("input", { bubbles: true }));
};
/** 화면 함수가 돌려주는 약속(결과를 기다리지 않는 테스트용) */
const pending: Promise<unknown>[] = [];
const flush = async () => {
  await vi.advanceTimersByTimeAsync(10);
};

const SCHOOLS: School[] = [
  { code: "T10:1111111", name: "테스트초등학교", region: "테스트시", address: "가나구 다라로 12" },
  { code: "U10:2222222", name: "테스트초등학교", region: "예시시", address: "사아구 자차로 3" },
];

describe("학습 설정 화면", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.getElementById(SETUP_OVERLAY_ID)?.remove();
  });

  it("과목·학년·학기·난이도를 고르면 그 학기 단원과 난이도 설명이 보인다", () => {
    pending.push(showSetup({ search: async () => [] }));
    clickText(SETUP_OVERLAY_ID, "국어");
    clickText(SETUP_OVERLAY_ID, "5");
    clickText(SETUP_OVERLAY_ID, "2학기");
    clickText(SETUP_OVERLAY_ID, "익스트림");
    expect(setup(".su-units").textContent).toContain("국어 5학년 2학기");
    expect(setup(".su-desc").textContent).toContain("익스트림");
    expect(setup(".su-desc").textContent).toContain("힌트 없음");
    const on = all(SETUP_OVERLAY_ID, "button.on").map(b => b.textContent);
    expect(on).toEqual(expect.arrayContaining(["국어", "5", "2학기", "익스트림"]));
  });

  it("학교를 찾고, 같은 이름은 지역·주소로 구분해서 고른다", async () => {
    const search = vi.fn().mockResolvedValue(SCHOOLS);
    const p = showSetup({ search });
    type(setup('input[aria-label="학교 이름"]') as HTMLInputElement, "테스트초");
    clickText(SETUP_OVERLAY_ID, "찾기");
    await flush();
    expect(search).toHaveBeenCalledWith("테스트초", { region: "", page: 1 });
    const results = all(SETUP_OVERLAY_ID, ".su-res");
    expect(results).toHaveLength(2);
    expect(results[1].textContent).toContain("예시시");
    results[1].click();
    expect(setup(".su-chosen").textContent).toContain("테스트초등학교");
    expect(setup(".su-chosen").textContent).toContain("사아구 자차로 3");
    // 학교 검색칸은 숨고, 시작 가능
    type(setup('input[aria-label="반"]') as HTMLInputElement, "여울반");
    type(setup('input[aria-label="번호"]') as HTMLInputElement, "6");
    clickText(SETUP_OVERLAY_ID, "저장하고 시작");
    await vi.advanceTimersByTimeAsync(400);
    const profile = (await p) as LearnerProfile;
    expect(profile.school?.code).toBe("U10:2222222");
    expect(profile).toMatchObject({ className: "여울반", studentNo: 6 });
  });

  it("지역을 고르면 그 지역으로 찾고, '더 보기'로 다음 쪽을 이어 받는다", async () => {
    const mk = (n: number): School => ({
      code: `T10:${n}`,
      name: `테스트${n}초등학교`,
      region: "테스트시",
      address: "가나구",
    });
    const search = vi
      .fn()
      .mockResolvedValueOnce({ schools: [mk(1), mk(2), mk(3), mk(4), mk(5)], total: 7, page: 1, rows: 5 })
      .mockResolvedValueOnce({ schools: [mk(6), mk(7)], total: 7, page: 2, rows: 2 });
    pending.push(showSetup({ search }));
    (setup('select[aria-label="지역"]') as HTMLSelectElement).value = "T10";
    type(setup('input[aria-label="학교 이름"]') as HTMLInputElement, "테스트");
    clickText(SETUP_OVERLAY_ID, "찾기");
    await flush();
    expect(search).toHaveBeenLastCalledWith("테스트", { region: "T10", page: 1 });
    expect(all(SETUP_OVERLAY_ID, ".su-res")).toHaveLength(5);
    expect(setup(".ek-note").textContent).toContain("7곳 중 5곳");
    clickText(SETUP_OVERLAY_ID, "더 보기");
    await flush();
    expect(search).toHaveBeenLastCalledWith("테스트", { region: "T10", page: 2 });
    expect(all(SETUP_OVERLAY_ID, ".su-res")).toHaveLength(7);
    expect(setup(".ek-note").textContent).toContain("7곳을 찾았어요");
    expect(all(SETUP_OVERLAY_ID, "button").find(b => b.textContent?.startsWith("더 보기"))!.style.display).toBe("none");
    // 새로 찾으면 처음부터
    clickText(SETUP_OVERLAY_ID, "찾기");
    await flush();
    expect(search).toHaveBeenCalledTimes(3);
    expect(search).toHaveBeenLastCalledWith("테스트", { region: "T10", page: 1 });
  });

  it("검색이 안 되면 직접 입력할 수 있다", async () => {
    const p = showSetup({ search: async () => Promise.reject(new Error("offline")) });
    type(setup('input[aria-label="학교 이름"]') as HTMLInputElement, "우리초");
    clickText(SETUP_OVERLAY_ID, "찾기");
    await flush();
    expect(setup(".ek-note").textContent).toContain("직접 입력");
    type(setup('input[aria-label="학교 이름 직접 입력"]') as HTMLInputElement, "우리초등학교");
    clickText(SETUP_OVERLAY_ID, "이 이름으로 정하기");
    expect(setup(".su-chosen").textContent).toContain("우리초등학교");
    clickText(SETUP_OVERLAY_ID, "3반"); // 반 빠른 선택
    clickText(SETUP_OVERLAY_ID, "저장하고 시작");
    await vi.advanceTimersByTimeAsync(400);
    const profile = (await p) as LearnerProfile;
    expect(profile.school).toEqual({ code: "manual:우리초등학교", name: "우리초등학교", region: "" });
    expect(profile.className).toBe("3");
  });

  it("빠진 칸이 있으면 이유를 알려 주고 닫히지 않는다", async () => {
    pending.push(showSetup({ search: async () => [] }));
    clickText(SETUP_OVERLAY_ID, "저장하고 시작");
    expect(setup(".ek-msg").textContent).toContain("학교");
    expect(document.getElementById(SETUP_OVERLAY_ID)).not.toBeNull();
  });

  it("이전 설정이 채워져 있고, 취소하면 null", async () => {
    const initial: LearnerProfile = {
      ...DEFAULT_PROFILE,
      subject: "eng",
      grade: 4,
      semester: 2,
      school: SCHOOLS[0],
      className: "2",
      studentNo: 17,
      nickname: "별",
    };
    const p = showSetup({ initial, allowCancel: true });
    expect((setup('input[aria-label="반"]') as HTMLInputElement).value).toBe("2");
    expect((setup('input[aria-label="번호"]') as HTMLInputElement).value).toBe("17");
    expect(all(SETUP_OVERLAY_ID, "button.on").map(b => b.textContent)).toEqual(
      expect.arrayContaining(["영어", "4", "2학기"]),
    );
    clickText(SETUP_OVERLAY_ID, "취소");
    await vi.advanceTimersByTimeAsync(400);
    expect(await p).toBeNull();
  });

  it("랭킹 동의: 처음엔 체크가 없고, 체크해야 랭킹에 올라간다고 저장된다", async () => {
    const base: LearnerProfile = { ...DEFAULT_PROFILE, school: SCHOOLS[0], className: "2", studentNo: 5 };
    const consent = () => setup('input[aria-label="랭킹 동의"]') as HTMLInputElement;

    const p1 = showSetup({ initial: base, search: async () => [] });
    expect(consent().checked).toBe(false);
    clickText(SETUP_OVERLAY_ID, "저장하고 시작");
    await vi.advanceTimersByTimeAsync(400);
    expect(((await p1) as LearnerProfile).rankingConsent).toBe(false);

    const p2 = showSetup({ initial: base, search: async () => [] });
    consent().click();
    clickText(SETUP_OVERLAY_ID, "저장하고 시작");
    await vi.advanceTimersByTimeAsync(400);
    expect(((await p2) as LearnerProfile).rankingConsent).toBe(true);

    const p3 = showSetup({ initial: { ...base, rankingConsent: true }, allowCancel: true, search: async () => [] });
    expect(consent().checked).toBe(true);
    clickText(SETUP_OVERLAY_ID, "취소");
    pending.push(p3);
  });

  it("연습할 단원 고르기: 단원을 골라 저장하고, 과목·학년이 바뀌면 비워진다", async () => {
    const base: LearnerProfile = {
      ...DEFAULT_PROFILE,
      subject: "math",
      grade: 5,
      semester: 1,
      school: SCHOOLS[0],
      className: "2",
      studentNo: 5,
    };
    const p = showSetup({ initial: base, search: async () => [] });
    expect(setup(".su-unitchips").style.display).toBe("none");
    expect(setup(".su-link").textContent).toContain("연습할 단원 고르기");
    (all(SETUP_OVERLAY_ID, ".su-link")[0] as HTMLElement).click(); // 단원 목록 열기
    expect(setup(".su-unitchips").style.display).not.toBe("none");
    const chips = all(SETUP_OVERLAY_ID, ".su-unitchips button");
    expect(chips.length).toBeGreaterThanOrEqual(5);
    const names = chips.map(c => c.textContent);
    expect(names).toContain("약수와 배수");
    chips.find(c => c.textContent === "약수와 배수")!.click();
    chips.find(c => c.textContent === "다각형의 넓이")!.click();
    expect(setup(".su-link").textContent).toContain("2개");
    clickText(SETUP_OVERLAY_ID, "저장하고 시작");
    await vi.advanceTimersByTimeAsync(400);
    expect(((await p) as LearnerProfile).units).toEqual(["약수와 배수", "다각형의 넓이"]);

    // 학년을 바꾸면 고른 단원이 비워진다
    const p2 = showSetup({ initial: { ...base, units: ["약수와 배수"] }, search: async () => [] });
    expect(setup(".su-link").textContent).toContain("1개");
    clickText(SETUP_OVERLAY_ID, "6");
    expect(setup(".su-link").textContent).toContain("연습할 단원 고르기");
    clickText(SETUP_OVERLAY_ID, "저장하고 시작");
    await vi.advanceTimersByTimeAsync(400);
    expect(((await p2) as LearnerProfile).units).toEqual([]);
  });

  it("입력 칸에서 누른 키가 게임(window)까지 올라가지 않는다", () => {
    pending.push(showSetup({ search: async () => [] }));
    const onWindow = vi.fn();
    window.addEventListener("keydown", onWindow);
    setup('input[aria-label="반"]').dispatchEvent(new KeyboardEvent("keydown", { key: "z", bubbles: true }));
    expect(onWindow).not.toHaveBeenCalled();
    window.removeEventListener("keydown", onWindow);
  });
});

describe("랭킹 화면", () => {
  const profile: LearnerProfile = {
    ...DEFAULT_PROFILE,
    subject: "math",
    grade: 6,
    school: SCHOOLS[0],
    className: "여울반",
    studentNo: 6,
  };
  const row = (uid: string, no: number, cls: string, points: number, nickname = ""): RankRow => ({
    uid,
    subject: "math",
    school_code: "T10:1111111",
    school_name: "테스트초등학교",
    grade: 6,
    class_name: cls,
    student_no: no,
    nickname,
    points,
    solved: 10,
    best_wave: 3,
    best_streak: 2,
  });
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.getElementById(RANKING_OVERLAY_ID)?.remove();
  });

  it("서버가 없으면 안내하고 내 기록만 보여 준다", () => {
    const stats = emptyAllStats();
    stats.math.points = 777;
    pending.push(showRanking({ profile, stats, online: false }));
    expect(sel(RANKING_OVERLAY_ID, ".rk-me").textContent).toContain("777");
    expect(sel(RANKING_OVERLAY_ID, ".rk-table").textContent).toContain("랭킹 서버가 연결되지 않았어요");
  });

  it("Enter 를 누르고 있어도(반복 입력) 랭킹 화면이 바로 닫히지 않는다", () => {
    pending.push(showRanking({ profile, stats: emptyAllStats(), online: false }));
    const root = document.getElementById(RANKING_OVERLAY_ID);
    expect(root).not.toBeNull();
    // 누르고 있는 키의 반복 입력은 무시한다
    for (let i = 0; i < 5; i++) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", repeat: true, bubbles: true }));
    }
    vi.advanceTimersByTime(400);
    expect(document.getElementById(RANKING_OVERLAY_ID)).not.toBeNull();
    // 새로 누른 Enter 는 닫는다
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    vi.advanceTimersByTime(400);
    expect(document.getElementById(RANKING_OVERLAY_ID)).toBeNull();
  });

  it("랭킹 동의를 안 했으면 안내 문구가 보인다", async () => {
    pending.push(
      showRanking({
        profile: { ...profile, rankingConsent: false },
        stats: emptyAllStats(),
        online: true,
        fetchRows: async () => [],
      }),
    );
    await flush();
    expect(sel(RANKING_OVERLAY_ID, ".ek-msg").textContent).toContain("동의");
    document.getElementById(RANKING_OVERLAY_ID)?.remove();
    pending.push(
      showRanking({
        profile: { ...profile, rankingConsent: true },
        stats: emptyAllStats(),
        online: true,
        fetchRows: async () => [],
      }),
    );
    await flush();
    expect(sel(RANKING_OVERLAY_ID, ".ek-msg").textContent).toBe("");
  });

  it("우리 반 순위: 점수 순, 내 줄 강조, 공동 순위", async () => {
    const rows = [row("x", 1, "여울반", 300, "별이"), row(getUid(), 6, "여울반", 200), row("y", 9, "여울반", 200)];
    const fetchRows = vi.fn().mockResolvedValue(rows);
    pending.push(showRanking({ profile, stats: emptyAllStats(), online: true, fetchRows }));
    await flush();
    expect(fetchRows).toHaveBeenCalledWith("class", profile, "math");
    const lines = all(RANKING_OVERLAY_ID, ".rk-row").filter(r => !r.classList.contains("head"));
    expect(lines.map(l => l.querySelector(".rk-rank")!.textContent)).toEqual(["1", "2", "2"]);
    expect(lines[0].textContent).toContain("1번 별이");
    expect(lines[1].classList.contains("me")).toBe(true);
  });

  it("학년 탭은 반별 합계로, 과목 탭을 누르면 그 과목을 다시 불러온다", async () => {
    const rows = [row("a", 1, "1", 100), row("b", 2, "1", 100), row("c", 1, "여울반", 150)];
    const fetchRows = vi.fn().mockResolvedValue(rows);
    pending.push(showRanking({ profile, stats: emptyAllStats(), online: true, fetchRows }));
    await flush();
    clickText(RANKING_OVERLAY_ID, "우리 학년");
    await flush();
    expect(fetchRows).toHaveBeenLastCalledWith("grade", profile, "math");
    const lines = all(RANKING_OVERLAY_ID, ".rk-row").filter(r => !r.classList.contains("head"));
    expect(lines[0].textContent).toContain("1반"); // 200점
    expect(lines[0].textContent).toContain("2명");
    expect(lines[1].classList.contains("me")).toBe(true); // 내 반(여울반)
    clickText(RANKING_OVERLAY_ID, "국어");
    await flush();
    expect(fetchRows).toHaveBeenLastCalledWith("grade", profile, "kor");
  });

  it("기록이 없거나 서버 오류가 나도 화면이 깨지지 않는다", async () => {
    pending.push(showRanking({ profile, stats: emptyAllStats(), online: true, fetchRows: async () => [] }));
    await flush();
    expect(sel(RANKING_OVERLAY_ID, ".rk-table").textContent).toContain("아직 기록이 없어요");
    document.getElementById(RANKING_OVERLAY_ID)?.remove();
    pending.push(
      showRanking({
        profile,
        stats: emptyAllStats(),
        online: true,
        fetchRows: async () => Promise.reject(new Error("랭킹 서버 오류 (500)")),
      }),
    );
    await flush();
    expect(sel(RANKING_OVERLAY_ID, ".rk-table").textContent).toContain("불러오지 못했어요");
  });

  it("Esc 로 닫는다", async () => {
    const closed = vi.fn();
    pending.push(showRanking({ profile, stats: emptyAllStats(), online: false }).then(closed));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
    await vi.advanceTimersByTimeAsync(400);
    expect(closed).toHaveBeenCalled();
    expect(document.getElementById(RANKING_OVERLAY_ID)).toBeNull();
  });
});
