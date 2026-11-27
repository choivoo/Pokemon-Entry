/** 학습자 프로필: 과목 · 학년 · 학기 · 학교 · 반 · 번호 · 난이도 (이 브라우저의 계정별로 저장) */
import { DIFFICULTIES, type Difficulty } from "#app/edu/difficulty";
import { SUBJECTS, type Subject, termIndex } from "#app/edu/question";

export interface School {
  /** 교육청코드:학교코드 (직접 입력한 학교는 `manual:학교이름`) */
  code: string;
  name: string;
  /** 시도 (예: 서울특별시) */
  region: string;
  /** 도로명 주소 일부 (같은 이름의 학교를 구분하는 데 쓴다) */
  address?: string;
}

export interface LearnerProfile {
  subject: Subject;
  grade: number;
  semester: number;
  difficulty: Difficulty;
  school: School | null;
  /** 반 (숫자 "6" 또는 이름 "여울반") */
  className: string;
  studentNo: number;
  nickname: string;
}

export const DEFAULT_PROFILE: LearnerProfile = {
  subject: "math",
  grade: 3,
  semester: 1,
  difficulty: "normal",
  school: null,
  className: "",
  studentNo: 1,
  nickname: "",
};

export function profileTerm(p: LearnerProfile): number {
  return termIndex(p.grade, p.semester);
}

/** 반 이름을 보기 좋게: "6" → "6반", "여울반" → "여울반" */
export function classLabel(className: string): string {
  const t = className.trim();
  return /^\d+$/.test(t) ? `${t}반` : t;
}

/** 랭킹에서 같은 반을 묶는 키 */
export function classKey(p: LearnerProfile): string {
  return `${p.school?.code ?? "none"}|${p.grade}|${p.className.trim()}`;
}

export function describeClass(p: LearnerProfile): string {
  return `${p.school?.name ?? "학교 미설정"} ${p.grade}학년 ${classLabel(p.className)}`;
}

export interface ProfileErrors {
  [field: string]: string;
}

export function validateProfile(p: LearnerProfile): ProfileErrors {
  const e: ProfileErrors = {};
  if (!SUBJECTS.includes(p.subject)) {
    e.subject = "과목을 골라 주세요.";
  }
  if (!Number.isInteger(p.grade) || p.grade < 1 || p.grade > 6) {
    e.grade = "학년을 골라 주세요.";
  }
  if (p.semester !== 1 && p.semester !== 2) {
    e.semester = "학기를 골라 주세요.";
  }
  if (!DIFFICULTIES.includes(p.difficulty)) {
    e.difficulty = "난이도를 골라 주세요.";
  }
  if (!p.school || p.school.name.trim().length < 2) {
    e.school = "학교를 찾아서 골라 주세요.";
  }
  const cn = p.className.trim();
  if (cn.length === 0 || cn.length > 8 || /[<>"'&]/.test(cn)) {
    e.className = "반을 적어 주세요. (예: 1, 2, 여울반)";
  }
  if (!Number.isInteger(p.studentNo) || p.studentNo < 1 || p.studentNo > 60) {
    e.studentNo = "번호는 1~60 사이로 적어 주세요.";
  }
  if (p.nickname.length > 8 || /[<>"'&]/.test(p.nickname)) {
    e.nickname = "별명은 8글자 이하로 적어 주세요.";
  }
  return e;
}

// #region 저장

const PROFILE_KEY = "pkr_edu_profile:";

function storage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return;
  }
}

export function loadProfile(username: string): LearnerProfile | null {
  try {
    const raw = storage()?.getItem(PROFILE_KEY + username);
    if (!raw) {
      return null;
    }
    const p = { ...DEFAULT_PROFILE, ...JSON.parse(raw) } as LearnerProfile;
    return p;
  } catch {
    return null;
  }
}

export function saveProfile(username: string, p: LearnerProfile): void {
  try {
    storage()?.setItem(PROFILE_KEY + username, JSON.stringify(p));
  } catch {
    // 저장 공간이 없으면 이번 접속 동안만 쓴다
  }
}

/** 지금 쓰는 프로필 (로그인한 계정 기준) */
let active: LearnerProfile | null = null;
let activeUser = "";

export function getActiveProfile(username: string): LearnerProfile | null {
  if (active && activeUser === username) {
    return active;
  }
  active = loadProfile(username);
  activeUser = username;
  return active;
}

export function setActiveProfile(username: string, p: LearnerProfile): void {
  active = p;
  activeUser = username;
  saveProfile(username, p);
}

export function clearActiveProfile(): void {
  active = null;
  activeUser = "";
}

// #endregion
