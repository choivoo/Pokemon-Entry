/**
 * 수학 포켓로그: 비례식 / 비례배분 문제 생성기.
 *
 * 문제는 "숫자 데이터"({@linkcode MathProblem})로만 만들고, 문장은 `math-text.ts`가 언어별로 만든다.
 * 이 파일은 게임 엔진에 의존하지 않는 순수 모듈이라 단독으로 테스트할 수 있다.
 */

export type MathProblemKind = "proportion" | "share2" | "share3" | "difference";

/** 문제에 등장하는 물건 종류 */
export type MathItemKey = "pokeball" | "potion" | "berry" | "rareCandy" | "pokeFood" | "stardust";

interface BaseProblem {
  kind: MathProblemKind;
  /** 정답 (항상 양의 정수) */
  answer: number;
  /** 난이도 1~4 */
  level: 1 | 2 | 3 | 4;
}

/** `terms[0] : terms[1] = terms[2] : terms[3]`, `terms[blank]`가 빈칸 */
export interface ProportionProblem extends BaseProblem {
  kind: "proportion";
  terms: [number, number, number, number];
  blank: 0 | 1 | 2 | 3;
}

/** 전체 `total`을 `ratio`로 나누었을 때 `ask`번째 사람의 몫 */
export interface ShareProblem extends BaseProblem {
  kind: "share2" | "share3";
  item: MathItemKey;
  total: number;
  ratio: number[];
  ask: number;
}

/** 비 `ratio[0] : ratio[1]` (ratio[0] > ratio[1]), 차이가 `diff`일 때 `ask`번째 값 */
export interface DifferenceProblem extends BaseProblem {
  kind: "difference";
  ratio: [number, number];
  diff: number;
  ask: 0 | 1;
}

export type MathProblem = ProportionProblem | ShareProblem | DifferenceProblem;

export type Rng = () => number;

const ITEM_KEYS: readonly MathItemKey[] = ["pokeball", "potion", "berry", "rareCandy", "pokeFood", "stardust"];

export function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[randInt(rng, 0, arr.length - 1)];
}

export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** 서로 다르고 서로소인 (a, b) */
function coprimePair(rng: Rng, max: number): [number, number] {
  for (let i = 0; i < 200; i++) {
    const a = randInt(rng, 1, max);
    const b = randInt(rng, 1, max);
    if (a !== b && gcd(a, b) === 1) {
      return [a, b];
    }
  }
  return [2, 3];
}

/** 웨이브(층)에 따른 난이도 1~4 */
export function getDifficulty(wave: number): 1 | 2 | 3 | 4 {
  if (wave < 10) {
    return 1;
  }
  if (wave < 30) {
    return 2;
  }
  if (wave < 70) {
    return 3;
  }
  return 4;
}

function makeProportion(rng: Rng, level: 1 | 2 | 3 | 4): ProportionProblem {
  const maxTerm = [5, 9, 12, 15][level - 1];
  const maxMul = [5, 9, 12, 15][level - 1];
  const [a, b] = coprimePair(rng, maxTerm);
  const k = randInt(rng, 2, maxMul);
  const terms: [number, number, number, number] = [a, b, a * k, b * k];
  // 높은 난이도에서는 좌우를 바꿔서 "큰 비 = 작은 비" 형태도 낸다
  if (level >= 3 && rng() < 0.5) {
    terms.push(...terms.splice(0, 2));
  }
  const blank = randInt(rng, 0, 3) as 0 | 1 | 2 | 3;
  return { kind: "proportion", level, terms, blank, answer: terms[blank] };
}

function makeShare(rng: Rng, level: 1 | 2 | 3 | 4, parts: 2 | 3): ShareProblem {
  let ratio: number[];
  if (parts === 2) {
    ratio = coprimePair(rng, [5, 8, 11, 13][level - 1]);
  } else {
    const max = level <= 3 ? 6 : 9;
    ratio = [1, 2, 3];
    for (let i = 0; i < 200; i++) {
      const r = [randInt(rng, 1, max), randInt(rng, 1, max), randInt(rng, 1, max)];
      if (new Set(r).size === 3 && gcd(gcd(r[0], r[1]), r[2]) === 1) {
        ratio = r;
        break;
      }
    }
  }
  const sum = ratio.reduce((x, y) => x + y, 0);
  const unit = randInt(rng, 2, [6, 12, 20, 30][level - 1]);
  const ask = randInt(rng, 0, parts - 1);
  return {
    kind: parts === 2 ? "share2" : "share3",
    level,
    item: pick(rng, ITEM_KEYS),
    total: sum * unit,
    ratio,
    ask,
    answer: ratio[ask] * unit,
  };
}

function makeDifference(rng: Rng, level: 1 | 2 | 3 | 4): DifferenceProblem {
  const [x, y] = coprimePair(rng, level <= 3 ? 9 : 12);
  const ratio: [number, number] = [Math.max(x, y), Math.min(x, y)];
  const unit = randInt(rng, 2, level <= 3 ? 10 : 15);
  const ask = randInt(rng, 0, 1) as 0 | 1;
  return {
    kind: "difference",
    level,
    ratio,
    diff: (ratio[0] - ratio[1]) * unit,
    ask,
    answer: ratio[ask] * unit,
  };
}

const POOLS: Record<1 | 2 | 3 | 4, MathProblemKind[]> = {
  1: ["proportion", "proportion", "share2"],
  2: ["proportion", "share2", "share2"],
  3: ["proportion", "share2", "share3", "difference"],
  4: ["share2", "share3", "difference", "difference"],
};

/**
 * 웨이브에 맞는 문제를 하나 만든다.
 * @param wave - 방금 클리어한 웨이브(층) 번호
 * @param rng - 난수 함수 (기본 `Math.random`)
 * @param exclude - 직전 문제와 같은 종류를 피하고 싶을 때
 */
export function generateProblem(wave: number, rng: Rng = Math.random, exclude?: MathProblemKind): MathProblem {
  const level = getDifficulty(wave);
  const pool = POOLS[level];
  const filtered = pool.filter(k => k !== exclude);
  switch (pick(rng, filtered.length > 0 ? filtered : pool)) {
    case "proportion":
      return makeProportion(rng, level);
    case "share2":
      return makeShare(rng, level, 2);
    case "share3":
      return makeShare(rng, level, 3);
    case "difference":
      return makeDifference(rng, level);
  }
}

/** 정답 판정 */
export function checkAnswer(problem: MathProblem, input: string): boolean {
  const trimmed = input.trim();
  return /^\d+$/.test(trimmed) && Number(trimmed) === problem.answer;
}
