/** 내 학습 기록 (이 브라우저의 계정별 저장) */
import { SUBJECTS, type Subject } from "#app/edu/question";

export interface SubjectStats {
  /** 누적 점수 */
  points: number;
  /** 푼(맞힌) 문제 수 */
  solved: number;
  /** 한 번에 맞힌 수 */
  perfect: number;
  /** 가장 높이 오른 층 */
  bestWave: number;
  /** 가장 길었던 연속 정답 */
  bestStreak: number;
  updatedAt: number;
}

export type AllStats = Record<Subject, SubjectStats>;

const emptyStats = (): SubjectStats => ({ points: 0, solved: 0, perfect: 0, bestWave: 0, bestStreak: 0, updatedAt: 0 });

export const emptyAllStats = (): AllStats => ({ kor: emptyStats(), eng: emptyStats(), math: emptyStats() });

const KEY = "pkr_edu_stats:";
const UID_KEY = "pkr_edu_uid";

function storage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return;
  }
}

export function loadStats(username: string): AllStats {
  const base = emptyAllStats();
  try {
    const raw = storage()?.getItem(KEY + username);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AllStats>;
      for (const s of SUBJECTS) {
        base[s] = { ...base[s], ...(parsed[s] ?? {}) };
      }
    }
  } catch {
    // 깨진 기록은 새로 시작한다
  }
  return base;
}

export function saveStats(username: string, stats: AllStats): void {
  try {
    storage()?.setItem(KEY + username, JSON.stringify(stats));
  } catch {
    // 저장 공간이 없으면 이번 접속 동안만 쓴다
  }
}

export interface SolveRecord {
  subject: Subject;
  points: number;
  wave: number;
  streak: number;
  perfect: boolean;
}

/** 문제를 하나 풀 때마다 기록을 더한다 */
export function recordSolve(username: string, rec: SolveRecord, now = Date.now()): AllStats {
  const stats = loadStats(username);
  const s = stats[rec.subject];
  s.points += Math.max(0, Math.round(rec.points));
  s.solved += 1;
  s.perfect += rec.perfect ? 1 : 0;
  s.bestWave = Math.max(s.bestWave, rec.wave + 1);
  s.bestStreak = Math.max(s.bestStreak, rec.streak);
  s.updatedAt = now;
  saveStats(username, stats);
  return stats;
}

/** 서버 계정의 아이디로 바꾼다 (순위표에서 내 줄을 찾는 데 쓴다) */
export function setUid(uid: string): void {
  try {
    storage()?.setItem(UID_KEY, uid);
  } catch {
    // 저장 못 하면 이번 접속 동안만 쓴다
  }
}

/** 기기마다 정해지는 무작위 아이디 (랭킹에서 같은 사람을 구분하는 용도, 이름·계정과 무관) */
export function getUid(): string {
  const st = storage();
  try {
    const existing = st?.getItem(UID_KEY);
    if (existing) {
      return existing;
    }
  } catch {
    // 아래에서 새로 만든다
  }
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const uid = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
  try {
    st?.setItem(UID_KEY, uid);
  } catch {
    // 저장 못 하면 이번 접속 동안만 쓴다
  }
  return uid;
}
