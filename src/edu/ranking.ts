/**
 * 랭킹: 반별 · 학교별 점수판.
 *
 * 같은 학교 친구들과 점수를 나누려면 모두가 함께 쓰는 저장소가 필요해서, 무료 서버(Supabase)를 쓴다.
 * 서버 주소가 설정되어 있지 않으면 "이 기기" 기록만 보여 준다. (설정 방법은 README 참고)
 */
import { classLabel, type LearnerProfile } from "#app/edu/profile";
import type { Subject } from "#app/edu/question";
import { getUid, type SubjectStats } from "#app/edu/stats";

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
  best_wave: number;
  best_streak: number;
  updated_at?: string;
}

export const rankingHooks = {
  fetch: (url: string, init?: RequestInit) => fetch(url, init),
  url: (): string => (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, ""),
  key: (): string => import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
};

export function isRankingOnline(): boolean {
  return rankingHooks.url().startsWith("https://") && rankingHooks.key().length > 20;
}

const headers = (extra: Record<string, string> = {}): Record<string, string> => ({
  apikey: rankingHooks.key(),
  Authorization: `Bearer ${rankingHooks.key()}`,
  "Content-Type": "application/json",
  ...extra,
});

/** 내 기록을 서버 행으로 만든다 (숫자 범위와 글자 길이를 제한) */
export function toRow(profile: LearnerProfile, subject: Subject, s: SubjectStats, uid = getUid()): RankRow {
  const clampInt = (n: number, max: number) => Math.max(0, Math.min(max, Math.round(Number.isFinite(n) ? n : 0)));
  return {
    uid,
    subject,
    school_code: (profile.school?.code ?? "none").slice(0, 60),
    school_name: (profile.school?.name ?? "").slice(0, 40),
    grade: profile.grade,
    class_name: profile.className.trim().slice(0, 8),
    student_no: clampInt(profile.studentNo, 99),
    nickname: profile.nickname.trim().slice(0, 8),
    points: clampInt(s.points, 10_000_000),
    solved: clampInt(s.solved, 1_000_000),
    best_wave: clampInt(s.bestWave, 100_000),
    best_streak: clampInt(s.bestStreak, 100_000),
  };
}

/** 내 점수를 서버에 올린다. 실패해도 게임에는 영향이 없다. */
export async function submitScore(profile: LearnerProfile, subject: Subject, stats: SubjectStats): Promise<boolean> {
  if (!isRankingOnline() || !profile.school) {
    return false;
  }
  try {
    const res = await rankingHooks.fetch(`${rankingHooks.url()}/rest/v1/scores?on_conflict=uid,subject`, {
      method: "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(toRow(profile, subject, stats)),
    });
    return res.ok;
  } catch {
    return false;
  }
}

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
  const res = await rankingHooks.fetch(`${rankingHooks.url()}/rest/v1/scores?${q}`, { headers: headers() });
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
