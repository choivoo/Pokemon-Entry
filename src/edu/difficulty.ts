/** 난이도 4단계: 이지 / 노멀 / 하드 / 익스트림 */
export type Difficulty = "easy" | "normal" | "hard" | "extreme";
export const DIFFICULTIES: readonly Difficulty[] = ["easy", "normal", "hard", "extreme"];

export interface DifficultyRule {
  id: Difficulty;
  name: string;
  /** 한 줄 설명 */
  description: string;
  /** 문제 수준 조절(층에 따른 수준에 더한다) */
  levelOffset: number;
  /** 몇 번 틀리면 풀이를 보여주고 새 문제로 바꾸는지 */
  maxMisses: number;
  /** 문제당 힌트 사용 횟수 제한 (null = 제한 없음) */
  hints: number | null;
  /** 제한 시간(초), null = 없음. 시간이 끝나면 오답 1번 */
  timeLimit: number | null;
  /** 점수 배율 */
  scoreMultiplier: number;
  /** 보상 등급 행운 보너스 */
  rewardLuck: number;
  color: string;
}

export const DIFFICULTY_RULES: Record<Difficulty, DifficultyRule> = {
  easy: {
    id: "easy",
    name: "이지",
    description: "쉬운 문제 · 5번까지 틀려도 OK · 힌트 마음껏",
    levelOffset: -1,
    maxMisses: 5,
    hints: null,
    timeLimit: null,
    scoreMultiplier: 1,
    rewardLuck: 0,
    color: "#58d068",
  },
  normal: {
    id: "normal",
    name: "노멀",
    description: "기본 문제 · 3번까지 · 힌트 사용 가능",
    levelOffset: 0,
    maxMisses: 3,
    hints: null,
    timeLimit: null,
    scoreMultiplier: 1.5,
    rewardLuck: 0.2,
    color: "#58a8f8",
  },
  hard: {
    id: "hard",
    name: "하드",
    description: "어려운 문제 · 2번까지 · 힌트 1번 · 60초",
    levelOffset: 1,
    maxMisses: 2,
    hints: 1,
    timeLimit: 60,
    scoreMultiplier: 2,
    rewardLuck: 0.6,
    color: "#f8a038",
  },
  extreme: {
    id: "extreme",
    name: "익스트림",
    description: "가장 어려운 문제 · 1번만 · 힌트 없음 · 30초",
    levelOffset: 2,
    maxMisses: 1,
    hints: 0,
    timeLimit: 30,
    scoreMultiplier: 3,
    rewardLuck: 1.2,
    color: "#f05868",
  },
};

export function clampLevel(n: number): 1 | 2 | 3 | 4 {
  return Math.min(4, Math.max(1, Math.round(n))) as 1 | 2 | 3 | 4;
}

/** 층(웨이브)과 난이도로 문제 수준 1~4 를 정한다 */
export function levelForWave(wave: number, difficulty: Difficulty): 1 | 2 | 3 | 4 {
  const base = wave < 10 ? 1 : wave < 30 ? 2 : wave < 70 ? 3 : 4;
  return clampLevel(base + DIFFICULTY_RULES[difficulty].levelOffset);
}

/** 한 문제를 풀었을 때 점수 */
export function pointsFor(level: number, difficulty: Difficulty, perfect: boolean, streak: number): number {
  const base = 10 * level + (perfect ? 5 : 0) + Math.min(streak, 20);
  return Math.round(base * DIFFICULTY_RULES[difficulty].scoreMultiplier);
}
