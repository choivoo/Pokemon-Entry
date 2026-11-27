/**
 * 기기 사이 동기화: 서버 계정에 저장된 학습 설정과 점수를 이 기기와 맞춘다.
 * - 학습 설정(프로필): 서버에 있으면 서버 것을 쓰고, 서버에 없으면 이 기기의 것을 올린다
 * - 점수·기록: 서버 값을 기준으로 하고, 아직 못 올린 점수는 더해서 보여 준다
 */

import { SESSION_ID_COOKIE_NAME } from "#app/constants";
import { BackendError, isBackendOnline, rpc } from "#app/edu/backend";
import { adoptProfile, DEFAULT_PROFILE, type LearnerProfile, loadProfile, profileHooks } from "#app/edu/profile";
import { SUBJECTS } from "#app/edu/question";
import { flushQueue, pendingPoints } from "#app/edu/ranking";
import { loadStats, saveStats, setUid } from "#app/edu/stats";
import { getCookie } from "#utils/cookies";

export interface ServerScoreRow {
  subject: string;
  points: number;
  solved: number;
  perfect?: number;
  best_wave: number;
  best_streak: number;
}

export interface AccountData {
  uid: string;
  profile: Partial<LearnerProfile> | null;
  scores: ServerScoreRow[];
}

/** 서버 계정 정보를 이 기기에 반영한다 (로그인할 때마다 한 번) */
export function applyAccountData(username: string, data: AccountData): void {
  if (data.uid) {
    setUid(data.uid);
  }
  if (data.profile && typeof data.profile === "object") {
    adoptProfile(username, { ...DEFAULT_PROFILE, ...data.profile } as LearnerProfile);
  } else {
    // 서버에 아직 없으면, 이 기기에 있던 설정을 올린다
    const local = loadProfile(username);
    if (local) {
      void pushProfile(local);
    }
  }
  const stats = loadStats(username);
  for (const subject of SUBJECTS) {
    const row = data.scores.find(r => r.subject === subject);
    if (!row) {
      continue;
    }
    const s = stats[subject];
    s.points = row.points + pendingPoints(username, subject);
    s.solved = Math.max(s.solved, row.solved);
    s.perfect = Math.max(s.perfect, row.perfect ?? 0);
    s.bestWave = Math.max(s.bestWave, row.best_wave);
    s.bestStreak = Math.max(s.bestStreak, row.best_streak);
  }
  saveStats(username, stats);
  // 인터넷이 안 되어 못 올렸던 점수가 있으면 이어서 올린다
  void flushQueue(username);
}

/** 학습 설정을 서버 계정에 저장한다. 실패해도 게임에는 영향이 없다. */
export async function pushProfile(profile: LearnerProfile): Promise<boolean> {
  if (!isBackendOnline()) {
    return false;
  }
  const token = getCookie(SESSION_ID_COOKIE_NAME);
  if (!token) {
    return false;
  }
  try {
    const res = await rpc<{ ok: boolean }>("edu_profile_put", { p_token: token, p_profile: profile });
    return res.ok;
  } catch (e) {
    if (e instanceof BackendError) {
      return false;
    }
    throw e;
  }
}

// 프로필이 저장될 때마다 서버에도 올린다
profileHooks.onSave = (_username, profile) => {
  void pushProfile(profile);
};
