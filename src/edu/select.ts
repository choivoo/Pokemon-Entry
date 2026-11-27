/** 과목·학년·학기·난이도에 맞는 문제를 하나 뽑는다. */
import { ENG_GENS, ENG_TERMS } from "#app/edu/bank-english";
import { KOR_GENS, KOR_TERMS } from "#app/edu/bank-korean";
import { type Difficulty, levelForWave } from "#app/edu/difficulty";
import { MATH_GENS, MATH_TERMS } from "#app/edu/math-curriculum";
import { type Level, type Question, type Subject, termIndex } from "#app/edu/question";
import { generateProblemOfKind, type MathProblem, POOLS, pick, type Rng, randInt } from "#app/math/math-problems";
import { formatProblem } from "#app/math/math-text";

export interface PickOptions {
  subject: Subject;
  grade: number;
  semester: number;
  difficulty: Difficulty;
  /** 방금 클리어한 층 */
  wave: number;
  rng?: Rng;
  /** 직전 문제 유형 (연속으로 같은 유형을 피한다) */
  exclude?: string | undefined;
  /** 파티 포켓몬 이름 (비례배분 문제에 쓴다) */
  names?: string[];
}

/** 비례식 문제를 공통 형식으로 바꾼다 */
export function ratioToQuestion(p: MathProblem, lang: "ko" | "en", names: string[]): Question {
  const t = formatProblem(p, lang, names);
  return {
    subject: "math",
    kind: p.kind,
    category: t.category,
    level: p.level,
    prompt: t.question,
    answer: p.answer,
    unit: t.unit,
    hint: t.hint,
    explanation: t.explanation,
  };
}

/** 6학년 1학기에서 맛보기로 나오는 비의 성질 문제 */
const RATIO_BASIC = ["ratioProperty", "simplify", "simplifyDecimal", "simplifyFraction"] as const;

/** 한 학기의 문제 하나 */
function makeForTerm(subject: Subject, term: number, level: Level, rng: Rng, names: string[]): Question {
  if (subject === "math") {
    const id = pick(rng, MATH_TERMS[term]);
    if (id === "ratio:*") {
      const kind = pick(rng, POOLS[level]);
      return ratioToQuestion(generateProblemOfKind(kind, level, rng), "ko", names);
    }
    if (id === "ratio:basic") {
      return ratioToQuestion(generateProblemOfKind(pick(rng, RATIO_BASIC), level, rng), "ko", names);
    }
    return MATH_GENS[id](rng, level);
  }
  if (subject === "eng") {
    return ENG_GENS[pick(rng, ENG_TERMS[term])](rng, level, term);
  }
  return KOR_GENS[pick(rng, KOR_TERMS[term])](rng, level, term);
}

/**
 * 문제를 뽑는다.
 * - 대부분(약 80%)은 지금 학기 문제, 나머지는 한두 학기 전 복습 문제
 * - 직전과 같은 유형은 되도록 피한다
 */
export function pickQuestion(opts: PickOptions): Question {
  const rng = opts.rng ?? Math.random;
  const current = termIndex(opts.grade, opts.semester);
  const level = levelForWave(opts.wave, opts.difficulty);
  const names = opts.names ?? [];
  let q = makeForTerm(opts.subject, current, level, rng, names);
  for (let i = 0; i < 6; i++) {
    const term = current > 0 && rng() < 0.2 ? current - randInt(rng, 1, Math.min(2, current)) : current;
    q = makeForTerm(opts.subject, term, level, rng, names);
    if (q.kind !== opts.exclude) {
      break;
    }
  }
  return q;
}

/** 학기별 단원 이름 목록 (설정 화면 안내용) */
export function termCategories(subject: Subject, term: number): string[] {
  const rng = (() => {
    let s = 7;
    return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  })();
  const seen = new Set<string>();
  for (let i = 0; i < 60; i++) {
    seen.add(makeForTerm(subject, term, 2, rng, []).category);
  }
  return [...seen];
}
