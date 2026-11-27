/**
 * 랭킹: 반별 · 학교별 점수판.
 *
 * 같은 학교 친구들과 점수를 나누려면 모두가 함께 쓰는 서버가 필요해서 무료 서버(Supabase)를 쓴다.
 * 점수는 로그인한 본인만 서버 함수(`edu_submit_solve`)로 올릴 수 있고, 서버가 한 번에 250점 초과·
 * 3초 안의 연속 요청·랭킹 동의가 없는 계정을 막는다. (서버 설정 방법은 README 참고)
 * 서버 주소가 설정되어 있지 않으면 "이 기기" 기록만 보여 준다.
 */

import { SESSION_ID_COOKIE_NAME } from "#app/constants";
import { authHeaders, BackendError, backend, isBackendOnline, rpc } from "#app/edu/backend";
import { classLabel, type LearnerProfile } from "#app/edu/profile";
import type { Subject } from "#app/edu/question";
import { getCookie } from "#utils/cookies";

export interface RankRow {
  uid: string;
  subject: Subject;
  school_code: string;
  school_name: string;
  grade: number;
  class_name: string;
  student_no: number;
  nickname: string;
  points: number;
  solved: number;
  perfect?: number;
  best_wave: number;
  best_streak: number;
  updated_at?: string;
}

/** 서버 연결(테스트에서 바꿔 끼운다) */
export const rankingHooks = backend;
export const isRankingOnline = isBackendOnline;

export type RankScope = "class" | "grade" | "school";

/** 순위표에 쓸 행을 서버에서 가져온다 */
export async function fetchRanking(scope: RankScope, profile: LearnerProfile, subject: Subject): Promise<RankRow[]> {
  if (!isRankingOnline() || !profile.school) {
    return [];
  }
  const q = new URLSearchParams({
    select: "*",
    subject: `eq.${subject}`,
    school_code: `eq.${profile.school.code}`,
    order: "points.desc",
    limit: scope === "school" ? "500" : "200",
  });
  if (scope === "class") {
    q.set("grade", `eq.${profile.grade}`);
    q.set("class_name", `eq.${profile.className.trim()}`);
  } else if (scope === "grade") {
    q.set("grade", `eq.${profile.grade}`);
  }
  const res = await rankingHooks.fetch(`${rankingHooks.url()}/rest/v1/scores?${q}`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`랭킹 서버 오류 (${res.status})`);
  }
  return (await res.json()) as RankRow[];
}

export interface ClassTotal {
  grade: number;
  className: string;
  points: number;
  students: number;
}

/** 학생 점수를 반별로 합친다 (반 점수가 높은 순) */
export function aggregateClasses(rows: RankRow[]): ClassTotal[] {
  const map = new Map<string, ClassTotal>();
  for (const r of rows) {
    const key = `${r.grade}|${r.class_name}`;
    const cur = map.get(key) ?? { grade: r.grade, className: r.class_name, points: 0, students: 0 };
    cur.points += r.points;
    cur.students += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.points - a.points);
}

/** 같은 점수는 같은 순위(1, 2, 2, 4 …) */
export function withRanks<T extends { points: number }>(items: T[]): (T & { rank: number })[] {
  const out: (T & { rank: number })[] = [];
  items.forEach((it, i) => {
    const rank = i > 0 && items[i - 1].points === it.points ? out[i - 1].rank : i + 1;
    out.push({ ...it, rank });
  });
  return out;
}

/** 순위표에 보이는 이름: "6번 별명" (실명은 받지 않는다) */
export function displayName(r: Pick<RankRow, "student_no" | "nickname">): string {
  return r.nickname ? `${r.student_no}번 ${r.nickname}` : `${r.student_no}번`;
}

export function classText(r: Pick<RankRow, "grade" | "class_name">): string {
  return `${r.grade}학년 ${classLabel(r.class_name)}`;
}

// #region 점수 올리기

/** 문제 하나를 푼 기록 */
export interface SolveRecord {
  subject: Subject;
  points: number;
  wave: number;
  streak: number;
  perfect: boolean;
}

const QUEUE_KEY = "pkr_edu_queue:";
const MAX_QUEUE = 60;
/** 서버는 같은 계정의 연속 요청을 3초 간격으로 받는다 */
export const SUBMIT_GAP_MS = 3300;

function storage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return;
  }
}

export function loadQueue(username: string): SolveRecord[] {
  try {
    const raw = storage()?.getItem(QUEUE_KEY + username);
    return raw ? (JSON.parse(raw) as SolveRecord[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(username: string, q: SolveRecord[]): void {
  try {
    storage()?.setItem(QUEUE_KEY + username, JSON.stringify(q.slice(-MAX_QUEUE)));
  } catch {
    // 저장 공간이 없으면 이번 접속 동안만 쓴다
  }
}

/** 아직 서버에 못 올린 점수의 합 (과목별) */
export function pendingPoints(username: string, subject: Subject): number {
  return loadQueue(username)
    .filter(r => r.subject === subject)
    .reduce((sum, r) => sum + r.points, 0);
}

type SubmitResult = "ok" | "retry" | "rejected";

async function sendOne(rec: SolveRecord): Promise<SubmitResult> {
  try {
    const res = await rpc<{ ok: boolean; error?: string }>("edu_submit_solve", {
      p_token: getCookie(SESSION_ID_COOKIE_NAME) ?? "",
      p_subject: rec.subject,
      p_points: Math.max(1, Math.min(250, Math.round(rec.points))),
      p_wave: Math.max(0, Math.round(rec.wave)),
      p_streak: Math.max(0, Math.round(rec.streak)),
      p_perfect: rec.perfect,
    });
    if (res.ok) {
      return "ok";
    }
    return res.error === "too fast" ? "retry" : "rejected";
  } catch (e) {
    return e instanceof BackendError ? "retry" : "rejected";
  }
}

/** 대기열을 올릴 때 기다리는 방법 (테스트에서는 바로 지나가게 바꾼다) */
export const queueHooks = { wait: (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms)) };

/** 올리기는 한 번에 하나씩 차례로 한다 (서버의 3초 간격 규칙 때문에) */
let chain: Promise<void> = Promise.resolve();

async function flushOnce(username: string, wait: (ms: number) => Promise<void>): Promise<void> {
  let failures = 0;
  for (let guard = 0; guard < MAX_QUEUE + 10; guard++) {
    const q = loadQueue(username);
    if (q.length === 0 || !isRankingOnline()) {
      return;
    }
    const result = await sendOne(q[0]);
    if (result === "ok" || result === "rejected") {
      // 서버가 받았거나(ok), 받을 수 없는 기록(rejected)은 대기열에서 뺀다
      saveQueue(username, q.slice(1));
      failures = 0;
    } else if (++failures >= 3) {
      return; // 인터넷이 안 되면 다음에 다시
    }
    await wait(SUBMIT_GAP_MS);
  }
}

/** 못 올린 점수를 차례로 올린다 (서버의 3초 간격 규칙에 맞춰서) */
export function flushQueue(
  username: string,
  wait: (ms: number) => Promise<void> = ms => queueHooks.wait(ms),
): Promise<void> {
  const next = chain.then(() => flushOnce(username, wait));
  chain = next.catch(() => {});
  return next;
}

/**
 * 푼 문제의 점수를 서버에 올린다. 랭킹에 동의하지 않았거나 서버가 없으면 올리지 않는다.
 * 서버가 바로 받지 못하면 큐에 넣어 두었다가 나중에 올린다. 실패해도 게임에는 영향이 없다.
 */
export async function submitSolve(username: string, profile: LearnerProfile, rec: SolveRecord): Promise<boolean> {
  if (!isRankingOnline() || !profile.school || !profile.rankingConsent) {
    return false;
  }
  saveQueue(username, [...loadQueue(username), rec]);
  await flushQueue(username);
  return loadQueue(username).length === 0;
}

// #endregion
