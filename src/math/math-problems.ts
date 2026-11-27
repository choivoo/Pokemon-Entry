/**
 * 수학 포켓로그: 비례식 / 비례배분 문제 생성기.
 *
 * 초등 6학년 "비례식과 비례배분" 단원 전체(비의 성질, 간단한 자연수의 비, 비례식, 비례식의 성질,
 * 비례식의 활용, 비례배분)와 심화(연비, 톱니바퀴, 축척 등)를 다룬다.
 *
 * 문제는 "숫자 데이터"({@linkcode MathProblem})로만 만들고, 문장은 `math-text.ts`가 언어별로 만든다.
 * 이 파일은 게임 엔진에 의존하지 않는 순수 모듈이라 단독으로 테스트할 수 있다.
 * 모든 문제의 정답은 양의 정수다 (숫자 키패드로 입력).
 */

export const MATH_PROBLEM_KINDS = [
  // 비례식
  "proportion",
  "proportionDecimal",
  "proportionFraction",
  "meansProduct",
  "isProportion",
  // 비의 성질 · 간단한 자연수의 비
  "ratioProperty",
  "simplify",
  "simplifyDecimal",
  "simplifyFraction",
  // 비례식의 활용
  "directProportion",
  "mapScale",
  "mapScaleReverse",
  "gears",
  "rectangle",
  // 비례배분
  "share2",
  "share3",
  "shareOther",
  "shareTotal",
  "difference",
  "connected",
] as const;

export type MathProblemKind = (typeof MATH_PROBLEM_KINDS)[number];

/** 문제에 등장하는 물건 종류 */
export type MathItemKey = "pokeball" | "potion" | "berry" | "rareCandy" | "pokeFood" | "stardust";
export const ITEM_KEYS: readonly MathItemKey[] = ["pokeball", "potion", "berry", "rareCandy", "pokeFood", "stardust"];

/** 정비례 문제 상황 */
export type DirectContext = "price" | "recipe" | "walk" | "exp";
export const DIRECT_CONTEXTS: readonly DirectContext[] = ["price", "recipe", "walk", "exp"];

export type Level = 1 | 2 | 3 | 4;

/** 비례식 `a : b = c : d` 의 네 항. 소수·분수 항은 문자열로 둔다. */
export type Term = number | string;

export interface MathProblem {
  kind: MathProblemKind;
  level: Level;
  /** 정답 (항상 양의 정수) */
  answer: number;
  /** 문제 종류별 값 */
  v: {
    /** 비례식 네 항 (빈칸은 `blank` 위치) */
    terms?: [Term, Term, Term, Term];
    blank?: number;
    /** 비 (2개 또는 3개) */
    ratio?: number[];
    /** 결과 비 (간단한 비, 연비 등) */
    result?: number[];
    /** 비의 성질: 곱한/나눈 수 */
    k?: number;
    op?: "mul" | "div";
    /** 전체 양, 아는 몫, 차이, 둘레 등 */
    total?: number;
    known?: number;
    knownIdx?: number;
    diff?: number;
    /** 물어보는 사람/항 번호 */
    ask?: number;
    item?: MathItemKey;
    context?: DirectContext;
    /** 정비례: a 단위일 때 A, b 단위일 때는? */
    a?: number;
    A?: number;
    b?: number;
    /** 축척 1 : scale, 지도 길이(cm), 실제 길이(m) */
    scale?: number;
    mapCm?: number;
    realM?: number;
    /** 톱니바퀴: 톱니 수와 회전 수 */
    teeth?: [number, number];
    turns?: number;
    /** 비례식 고르기: 보기 4개 */
    choices?: [number, number, number, number][];
    /** 연비: A:B, B:C */
    ab?: [number, number];
    bc?: [number, number];
  };
}

export type Rng = () => number;

export function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[randInt(rng, 0, arr.length - 1)];
}

export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

/** 서로 다르고 서로소인 (a, b) */
export function coprimePair(rng: Rng, max: number, min = 1): [number, number] {
  for (let i = 0; i < 200; i++) {
    const a = randInt(rng, min, max);
    const b = randInt(rng, min, max);
    if (a !== b && gcd(a, b) === 1) {
      return [a, b];
    }
  }
  return [2, 3];
}

/** 소수 한 자리 문자열 (정수면 정수로) */
export function decimal(tenths: number): string {
  return tenths % 10 === 0 ? String(tenths / 10) : (tenths / 10).toFixed(1);
}

/** 웨이브(층)에 따른 난이도 1~4 */
export function getDifficulty(wave: number): Level {
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

const scaleBy = (level: Level, values: [number, number, number, number]) => values[level - 1];

// #region 비례식

function makeProportion(rng: Rng, level: Level): MathProblem {
  const [a, b] = coprimePair(rng, scaleBy(level, [5, 9, 12, 15]));
  const k = randInt(rng, 2, scaleBy(level, [5, 9, 12, 15]));
  const terms: [Term, Term, Term, Term] = [a, b, a * k, b * k];
  if (level >= 2 && rng() < 0.5) {
    terms.push(...terms.splice(0, 2));
  }
  const blank = randInt(rng, 0, 3);
  return { kind: "proportion", level, answer: terms[blank] as number, v: { terms, blank } };
}

/** 0.4 : 1.2 = 3 : □ */
function makeProportionDecimal(rng: Rng, level: Level): MathProblem {
  const [a, b] = coprimePair(rng, scaleBy(level, [5, 6, 9, 12]));
  let m = randInt(rng, 1, 9);
  if ((a * m) % 10 === 0 && (b * m) % 10 === 0) {
    m = 3;
  }
  const k = randInt(rng, 2, scaleBy(level, [5, 8, 10, 12]));
  const blank = randInt(rng, 2, 3);
  const terms: [Term, Term, Term, Term] = [decimal(a * m), decimal(b * m), a * k, b * k];
  return { kind: "proportionDecimal", level, answer: terms[blank] as number, v: { terms, blank } };
}

/** 1/2 : 1/3 = □ : 4  (1/p : 1/q = q : p) */
function makeProportionFraction(rng: Rng, level: Level): MathProblem {
  const [p, q] = coprimePair(rng, scaleBy(level, [5, 6, 8, 9]), 2);
  const k = randInt(rng, 2, scaleBy(level, [4, 6, 8, 10]));
  const blank = randInt(rng, 2, 3);
  const terms: [Term, Term, Term, Term] = [`1/${p}`, `1/${q}`, q * k, p * k];
  return { kind: "proportionFraction", level, answer: terms[blank] as number, v: { terms, blank } };
}

/** 비례식에서 외항(또는 내항)의 곱 */
function makeMeansProduct(rng: Rng, level: Level): MathProblem {
  const base = makeProportion(rng, level);
  const [a, b, c, d] = base.v.terms as number[];
  // ask 0 = 외항의 곱, 1 = 내항의 곱 (값은 같다)
  return {
    kind: "meansProduct",
    level,
    answer: a * d,
    v: { terms: [a, b, c, d], blank: base.v.blank!, ask: randInt(rng, 0, 1) },
  };
}

/** 비례식인 것을 고르기 (보기 번호가 정답) */
function makeIsProportion(rng: Rng, level: Level): MathProblem {
  const answerIdx = randInt(rng, 0, 3);
  const choices: [number, number, number, number][] = [];
  const max = scaleBy(level, [5, 7, 9, 11]);
  for (let i = 0; i < 4; i++) {
    const [a, b] = coprimePair(rng, max);
    const k = randInt(rng, 2, 6);
    if (i === answerIdx) {
      choices.push([a, b, a * k, b * k]);
    } else {
      // 마지막 항만 살짝 틀리게 (off ≠ 0 이면 a×d ≠ b×c 이므로 비례식이 아니다)
      const off = randInt(rng, 1, 3);
      const d = b * k - off >= 1 && rng() < 0.5 ? b * k - off : b * k + off;
      choices.push([a, b, a * k, d]);
    }
  }
  return { kind: "isProportion", level, answer: answerIdx + 1, v: { choices } };
}

// #endregion

// #region 비의 성질 · 간단한 자연수의 비

function makeRatioProperty(rng: Rng, level: Level): MathProblem {
  const [a, b] = coprimePair(rng, scaleBy(level, [6, 9, 12, 15]));
  const k = randInt(rng, 2, scaleBy(level, [5, 9, 12, 15]));
  const op = rng() < 0.5 ? "mul" : "div";
  const ask = randInt(rng, 0, 1);
  return {
    kind: "ratioProperty",
    level,
    answer: [a, b][ask] * (op === "mul" ? k : 1),
    v: { ratio: [a, b], k, op, ask },
  };
}

function makeSimplify(rng: Rng, level: Level): MathProblem {
  const [a, b] = coprimePair(rng, scaleBy(level, [6, 9, 12, 15]));
  const k = randInt(rng, 2, scaleBy(level, [6, 9, 12, 15]));
  const ask = randInt(rng, 0, 1);
  return { kind: "simplify", level, answer: [a, b][ask], v: { ratio: [a * k, b * k], result: [a, b], ask } };
}

function makeSimplifyDecimal(rng: Rng, level: Level): MathProblem {
  const [a, b] = coprimePair(rng, scaleBy(level, [5, 7, 9, 12]));
  let m = randInt(rng, 1, 9);
  if ((a * m) % 10 === 0 && (b * m) % 10 === 0) {
    m = 3;
  }
  const ask = randInt(rng, 0, 1);
  return { kind: "simplifyDecimal", level, answer: [a, b][ask], v: { ratio: [a * m, b * m], result: [a, b], ask } };
}

/** 1/p : 1/q → q : p */
function makeSimplifyFraction(rng: Rng, level: Level): MathProblem {
  const [p, q] = coprimePair(rng, scaleBy(level, [5, 7, 9, 11]), 2);
  const ask = randInt(rng, 0, 1);
  return { kind: "simplifyFraction", level, answer: [q, p][ask], v: { ratio: [p, q], result: [q, p], ask } };
}

// #endregion

// #region 비례식의 활용

function makeDirect(rng: Rng, level: Level): MathProblem {
  const context = pick(rng, DIRECT_CONTEXTS);
  const unit = context === "price" ? 100 * randInt(rng, 1, 5) : randInt(rng, 2, scaleBy(level, [9, 15, 25, 40]));
  const [a, b] = coprimePair(rng, scaleBy(level, [5, 9, 12, 15]));
  return { kind: "directProportion", level, answer: b * unit, v: { context, a, A: a * unit, b } };
}

const SCALES = [1000, 2000, 5000, 10000, 20000, 25000, 50000, 100000];

/** 축척 1 : S 지도에서 L cm → 실제 m */
function makeMapScale(rng: Rng, level: Level): MathProblem {
  const scale = pick(rng, SCALES.slice(0, scaleBy(level, [3, 5, 7, 8])));
  const mapCm = randInt(rng, 2, scaleBy(level, [6, 9, 12, 15]));
  return { kind: "mapScale", level, answer: (mapCm * scale) / 100, v: { scale, mapCm } };
}

/** 실제 거리 → 지도 위 길이(cm) */
function makeMapScaleReverse(rng: Rng, level: Level): MathProblem {
  const p = makeMapScale(rng, level);
  return { kind: "mapScaleReverse", level, answer: p.v.mapCm!, v: { scale: p.v.scale!, realM: p.answer } };
}

/** 맞물린 두 톱니바퀴: 톱니 수 × 회전 수 가 같다 */
function makeGears(rng: Rng, level: Level): MathProblem {
  const [p, q] = coprimePair(rng, scaleBy(level, [4, 5, 6, 8]));
  const small = Math.min(p, q);
  const big = Math.max(p, q);
  const k = randInt(rng, 3, 8);
  const m = randInt(rng, 1, scaleBy(level, [3, 5, 6, 8]));
  // 톱니: 작은 바퀴 small*k, 큰 바퀴 big*k / 큰 바퀴가 small*m 바퀴 → 작은 바퀴 big*m 바퀴
  const ask = randInt(rng, 0, 1); // 0: 작은 바퀴 회전 수를 묻기, 1: 큰 바퀴 회전 수를 묻기
  return {
    kind: "gears",
    level,
    answer: ask === 0 ? big * m : small * m,
    v: { teeth: [small * k, big * k], turns: ask === 0 ? small * m : big * m, ask },
  };
}

/** 가로 : 세로 = a : b, 둘레 → 가로/세로 */
function makeRectangle(rng: Rng, level: Level): MathProblem {
  const [a, b] = coprimePair(rng, scaleBy(level, [5, 7, 9, 12]));
  const u = randInt(rng, 2, scaleBy(level, [6, 10, 15, 20]));
  const ask = randInt(rng, 0, 1);
  return { kind: "rectangle", level, answer: [a, b][ask] * u, v: { ratio: [a, b], total: 2 * (a + b) * u, ask } };
}

// #endregion

// #region 비례배분

function makeShare(rng: Rng, level: Level, parts: 2 | 3): MathProblem {
  let ratio: number[];
  if (parts === 2) {
    ratio = coprimePair(rng, scaleBy(level, [5, 8, 11, 13]));
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
  const unit = randInt(rng, 2, scaleBy(level, [6, 12, 20, 30]));
  const ask = randInt(rng, 0, parts - 1);
  return {
    kind: parts === 2 ? "share2" : "share3",
    level,
    answer: ratio[ask] * unit,
    v: { item: pick(rng, ITEM_KEYS), total: sum * unit, ratio, ask },
  };
}

/** 한 사람의 몫을 알 때 다른 사람의 몫 */
function makeShareOther(rng: Rng, level: Level): MathProblem {
  const ratio = coprimePair(rng, scaleBy(level, [5, 8, 11, 13]));
  const unit = randInt(rng, 2, scaleBy(level, [6, 12, 20, 30]));
  const knownIdx = randInt(rng, 0, 1);
  const ask = 1 - knownIdx;
  return {
    kind: "shareOther",
    level,
    answer: ratio[ask] * unit,
    v: { item: pick(rng, ITEM_KEYS), ratio, knownIdx, known: ratio[knownIdx] * unit, ask },
  };
}

/** 한 사람의 몫을 알 때 전체 양 */
function makeShareTotal(rng: Rng, level: Level): MathProblem {
  const p = makeShareOther(rng, level);
  const sum = p.v.ratio![0] + p.v.ratio![1];
  return { ...p, kind: "shareTotal", answer: (p.v.known! / p.v.ratio![p.v.knownIdx!]) * sum };
}

function makeDifference(rng: Rng, level: Level): MathProblem {
  const [x, y] = coprimePair(rng, level <= 3 ? 9 : 12);
  const ratio = [Math.max(x, y), Math.min(x, y)];
  const unit = randInt(rng, 2, level <= 3 ? 10 : 15);
  const ask = randInt(rng, 0, 1);
  return {
    kind: "difference",
    level,
    answer: ratio[ask] * unit,
    v: { ratio, diff: (ratio[0] - ratio[1]) * unit, ask },
  };
}

/** 연비: A:B = a1:b1, B:C = b2:c2 → A:B:C */
function makeConnected(rng: Rng, level: Level): MathProblem {
  for (let i = 0; i < 200; i++) {
    const ab = coprimePair(rng, scaleBy(level, [4, 5, 6, 7]));
    const bc = coprimePair(rng, scaleBy(level, [4, 5, 6, 7]));
    const l = lcm(ab[1], bc[0]);
    const result = [ab[0] * (l / ab[1]), l, bc[1] * (l / bc[0])];
    const g = gcd(gcd(result[0], result[1]), result[2]);
    const simple = result.map(n => n / g);
    if (ab[1] !== bc[0] && Math.max(...simple) <= 40) {
      const ask = randInt(rng, 0, 2);
      return { kind: "connected", level, answer: simple[ask], v: { ab, bc, result: simple, ask } };
    }
  }
  return { kind: "connected", level, answer: 8, v: { ab: [2, 3], bc: [4, 5], result: [8, 12, 15], ask: 0 } };
}

// #endregion

const MAKERS: Record<MathProblemKind, (rng: Rng, level: Level) => MathProblem> = {
  proportion: makeProportion,
  proportionDecimal: makeProportionDecimal,
  proportionFraction: makeProportionFraction,
  meansProduct: makeMeansProduct,
  isProportion: makeIsProportion,
  ratioProperty: makeRatioProperty,
  simplify: makeSimplify,
  simplifyDecimal: makeSimplifyDecimal,
  simplifyFraction: makeSimplifyFraction,
  directProportion: makeDirect,
  mapScale: makeMapScale,
  mapScaleReverse: makeMapScaleReverse,
  gears: makeGears,
  rectangle: makeRectangle,
  share2: (rng, level) => makeShare(rng, level, 2),
  share3: (rng, level) => makeShare(rng, level, 3),
  shareOther: makeShareOther,
  shareTotal: makeShareTotal,
  difference: makeDifference,
  connected: makeConnected,
};

/** 난이도별로 나오는 문제 종류 (여러 번 적힌 것은 더 자주 나온다) */
export const POOLS: Record<Level, MathProblemKind[]> = {
  1: ["proportion", "proportion", "simplify", "ratioProperty", "share2", "share2", "directProportion", "meansProduct"],
  2: [
    "proportion",
    "proportionDecimal",
    "simplify",
    "simplifyDecimal",
    "simplifyFraction",
    "isProportion",
    "share2",
    "shareOther",
    "directProportion",
    "mapScale",
  ],
  3: [
    "proportionDecimal",
    "proportionFraction",
    "isProportion",
    "share2",
    "share3",
    "shareOther",
    "shareTotal",
    "difference",
    "rectangle",
    "gears",
    "mapScale",
  ],
  4: [
    "proportionFraction",
    "share3",
    "shareTotal",
    "difference",
    "difference",
    "connected",
    "connected",
    "gears",
    "rectangle",
    "mapScaleReverse",
  ],
};

/** 특정 종류의 문제를 만든다 */
export function generateProblemOfKind(kind: MathProblemKind, level: Level, rng: Rng = Math.random): MathProblem {
  return MAKERS[kind](rng, level);
}

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
  return MAKERS[pick(rng, filtered.length > 0 ? filtered : pool)](rng, level);
}

/** 정답 판정 */
export function checkAnswer(problem: MathProblem, input: string): boolean {
  const trimmed = input.trim();
  return /^\d+$/.test(trimmed) && Number(trimmed) === problem.answer;
}
