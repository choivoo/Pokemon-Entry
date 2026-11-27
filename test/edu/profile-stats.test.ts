import {
  classKey,
  classLabel,
  DEFAULT_PROFILE,
  describeClass,
  getActiveProfile,
  type LearnerProfile,
  loadProfile,
  saveProfile,
  setActiveProfile,
  validateProfile,
} from "#app/edu/profile";
import { emptyAllStats, getUid, loadStats, recordSolve } from "#app/edu/stats";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const good: LearnerProfile = {
  ...DEFAULT_PROFILE,
  subject: "kor",
  grade: 6,
  semester: 2,
  difficulty: "hard",
  school: { code: "T10:1234567", name: "테스트초등학교", region: "테스트시" },
  className: "여울반",
  studentNo: 6,
  nickname: "별이",
};

describe("학습자 프로필", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("올바른 프로필은 오류가 없다", () => {
    expect(validateProfile(good)).toEqual({});
  });

  it("학교·반·번호·학년·별명을 검사한다", () => {
    expect(validateProfile({ ...good, school: null }).school).toBeTruthy();
    expect(validateProfile({ ...good, className: "" }).className).toBeTruthy();
    expect(validateProfile({ ...good, className: "여울여울여울여울반" }).className).toBeTruthy();
    expect(validateProfile({ ...good, className: "<b>" }).className).toBeTruthy();
    expect(validateProfile({ ...good, studentNo: 0 }).studentNo).toBeTruthy();
    expect(validateProfile({ ...good, studentNo: 61 }).studentNo).toBeTruthy();
    expect(validateProfile({ ...good, studentNo: 3.5 }).studentNo).toBeTruthy();
    expect(validateProfile({ ...good, grade: 7 }).grade).toBeTruthy();
    expect(validateProfile({ ...good, semester: 3 }).semester).toBeTruthy();
    expect(validateProfile({ ...good, nickname: "아주아주긴별명이에요" }).nickname).toBeTruthy();
    expect(validateProfile({ ...good, nickname: '"x"' }).nickname).toBeTruthy();
    expect(validateProfile({ ...good, subject: "art" as never }).subject).toBeTruthy();
    expect(validateProfile({ ...good, difficulty: "insane" as never }).difficulty).toBeTruthy();
  });

  it("반 이름 표시와 같은 반 키", () => {
    expect(classLabel("6")).toBe("6반");
    expect(classLabel("여울반")).toBe("여울반");
    expect(describeClass(good)).toBe("테스트초등학교 6학년 여울반");
    expect(classKey(good)).toBe("T10:1234567|6|여울반");
    expect(classKey({ ...good, className: " 여울반 " })).toBe(classKey(good));
  });

  it("계정별로 저장하고 다시 불러온다", () => {
    saveProfile("학생1", good);
    expect(loadProfile("학생1")).toEqual(good);
    expect(loadProfile("학생2")).toBeNull();
    setActiveProfile("학생2", { ...good, grade: 3 });
    expect(getActiveProfile("학생2")?.grade).toBe(3);
    expect(getActiveProfile("학생1")?.grade).toBe(6); // 계정이 바뀌면 그 계정의 것을 읽는다
    expect(loadProfile("학생2")?.grade).toBe(3);
  });

  it("깨진 저장값은 무시한다", () => {
    localStorage.setItem("pkr_edu_profile:깨짐", "{not json");
    expect(loadProfile("깨짐")).toBeNull();
  });
});

describe("학습 기록", () => {
  beforeEach(() => localStorage.clear());

  it("점수·푼 문제·최고 층·연속 정답이 과목별로 쌓인다", () => {
    expect(loadStats("a")).toEqual(emptyAllStats());
    recordSolve("a", { subject: "math", points: 30, wave: 4, streak: 1, perfect: true }, 1000);
    recordSolve("a", { subject: "math", points: 20, wave: 5, streak: 0, perfect: false }, 2000);
    recordSolve("a", { subject: "kor", points: 15, wave: 1, streak: 3, perfect: true }, 3000);
    const s = loadStats("a");
    expect(s.math).toMatchObject({ points: 50, solved: 2, perfect: 1, bestWave: 6, bestStreak: 1, updatedAt: 2000 });
    expect(s.kor).toMatchObject({ points: 15, solved: 1, bestStreak: 3 });
    expect(s.eng.points).toBe(0);
    expect(loadStats("b").math.points).toBe(0);
  });

  it("점수는 줄어들지 않는다", () => {
    recordSolve("a", { subject: "eng", points: -50, wave: 1, streak: 0, perfect: false });
    expect(loadStats("a").eng.points).toBe(0);
  });

  it("기기 아이디는 한 번 만들면 계속 같다", () => {
    const a = getUid();
    expect(a).toMatch(/^[0-9a-f]{24}$/);
    expect(getUid()).toBe(a);
  });
});
