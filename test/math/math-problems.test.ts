import {
  checkAnswer,
  generateProblem,
  generateProblemOfKind,
  getDifficulty,
  type Level,
  MATH_PROBLEM_KINDS,
  type MathProblem,
  POOLS,
} from "#app/math/math-problems";
import { formatProblem, josa, josaRo, toMathLang } from "#app/math/math-text";
import { seeded } from "#test/math/seeded-rng";
import { describe, expect, it } from "vitest";

/** "0.4", "1/3", 12 → 숫자 */
const num = (t: number | string): number => {
  if (typeof t === "number") {
    return t;
  }
  if (t.includes("/")) {
    const [a, b] = t.split("/").map(Number);
    return a / b;
  }
  return Number(t);
};
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** 문제 데이터만 보고 정답이 맞는지 독립적으로 검사 */
function verify(p: MathProblem): void {
  const v = p.v;
  switch (p.kind) {
    case "proportion":
    case "proportionDecimal":
    case "proportionFraction": {
      const t = v.terms!.map((x, i) => (i === v.blank ? p.answer : num(x)));
      expect(close(t[0] * t[3], t[1] * t[2])).toBe(true);
      return;
    }
    case "meansProduct": {
      const t = v.terms!.map(num);
      expect(p.answer).toBe(t[0] * t[3]);
      expect(p.answer).toBe(t[1] * t[2]);
      return;
    }
    case "isProportion": {
      const ok = v.choices!.map(([a, b, c, d]) => a * d === b * c);
      expect(ok.filter(Boolean)).toHaveLength(1);
      expect(ok[p.answer - 1]).toBe(true);
      return;
    }
    case "ratioProperty": {
      const [a, b] = v.ratio!;
      const expected = v.op === "mul" ? [a * v.k!, b * v.k!] : [a, b];
      expect(p.answer).toBe(expected[v.ask!]);
      return;
    }
    case "simplify":
    case "simplifyDecimal":
    case "simplifyFraction": {
      const [a, b] = v.result!;
      expect(gcd(a, b)).toBe(1);
      const [x, y] = v.ratio!;
      if (p.kind === "simplifyFraction") {
        expect(close(1 / x / (1 / y), a / b)).toBe(true);
      } else {
        expect(close(x / y, a / b)).toBe(true);
      }
      expect(p.answer).toBe(v.result![v.ask!]);
      return;
    }
    case "directProportion":
      expect(close(v.A! / v.a!, p.answer / v.b!)).toBe(true);
      return;
    case "mapScale":
      expect(p.answer * 100).toBe(v.mapCm! * v.scale!);
      return;
    case "mapScaleReverse":
      expect(p.answer * v.scale!).toBe(v.realM! * 100);
      return;
    case "gears": {
      const [small, big] = v.teeth!;
      if (v.ask === 0) {
        expect(small * p.answer).toBe(big * v.turns!);
      } else {
        expect(big * p.answer).toBe(small * v.turns!);
      }
      return;
    }
    case "rectangle": {
      const [a, b] = v.ratio!;
      const unit = v.total! / 2 / (a + b);
      expect(p.answer).toBe([a, b][v.ask!] * unit);
      return;
    }
    case "share2":
    case "share3": {
      const sum = v.ratio!.reduce((x, y) => x + y, 0);
      expect(v.total! % sum).toBe(0);
      expect(p.answer).toBe((v.total! / sum) * v.ratio![v.ask!]);
      expect(new Set(v.ratio).size).toBe(v.ratio!.length);
      return;
    }
    case "shareOther": {
      const unit = v.known! / v.ratio![v.knownIdx!];
      expect(p.answer).toBe(unit * v.ratio![v.ask!]);
      return;
    }
    case "shareTotal": {
      const unit = v.known! / v.ratio![v.knownIdx!];
      expect(p.answer).toBe(unit * (v.ratio![0] + v.ratio![1]));
      return;
    }
    case "difference": {
      const [big, small] = v.ratio!;
      expect(big).toBeGreaterThan(small);
      const unit = v.diff! / (big - small);
      expect(p.answer).toBe(v.ratio![v.ask!] * unit);
      return;
    }
    case "connected": {
      const [a, b, c] = v.result!;
      expect(close(a / b, v.ab![0] / v.ab![1])).toBe(true);
      expect(close(b / c, v.bc![0] / v.bc![1])).toBe(true);
      expect(gcd(gcd(a, b), c)).toBe(1);
      expect(p.answer).toBe(v.result![v.ask!]);
      return;
    }
  }
}

describe("수학 포켓로그 - 문제 생성기", () => {
  it("20가지 유형이 있고, 모든 유형이 어느 난이도에선가 나온다", () => {
    expect(MATH_PROBLEM_KINDS.length).toBe(20);
    const inPools = new Set(Object.values(POOLS).flat());
    expect([...MATH_PROBLEM_KINDS].filter(k => !inPools.has(k))).toEqual([]);
  });

  it("난이도는 층이 오를수록 올라간다", () => {
    expect([1, 15, 40, 120].map(getDifficulty)).toEqual([1, 2, 3, 4]);
  });

  for (const kind of MATH_PROBLEM_KINDS) {
    it(`${kind}: 정답은 양의 정수이고 문제 데이터와 맞는다`, () => {
      const rng = seeded(kind.length * 97);
      for (const level of [1, 2, 3, 4] as Level[]) {
        for (let i = 0; i < 150; i++) {
          const p = generateProblemOfKind(kind, level, rng);
          expect(p.kind).toBe(kind);
          expect(Number.isInteger(p.answer) && p.answer > 0, JSON.stringify(p)).toBe(true);
          expect(String(p.answer).length).toBeLessThanOrEqual(6);
          verify(p);
        }
      }
    });
  }

  it("층별 문제 뽑기는 직전 유형을 피한다", () => {
    const rng = seeded(9);
    for (let i = 0; i < 200; i++) {
      expect(generateProblem(5, rng, "proportion").kind).not.toBe("proportion");
    }
  });

  it("정답 판정은 숫자만 받는다", () => {
    const p = generateProblem(1, seeded(3));
    expect(checkAnswer(p, String(p.answer))).toBe(true);
    expect(checkAnswer(p, ` ${p.answer} `)).toBe(true);
    expect(checkAnswer(p, String(p.answer + 1))).toBe(false);
    expect(checkAnswer(p, "")).toBe(false);
    expect(checkAnswer(p, "1e3")).toBe(false);
  });
});

describe("수학 포켓로그 - 문장", () => {
  it("한국어 조사를 받침에 맞게 붙인다", () => {
    expect(josa("피카츄", "이", "가")).toBe("피카츄가");
    expect(josa("리자몽", "이", "가")).toBe("리자몽이");
    expect(josa("이브이", "과", "와")).toBe("이브이와");
    expect(josaRo("3 : 5")).toBe("3 : 5로");
    expect(josaRo("2 : 3")).toBe("2 : 3으로");
    expect(josaRo("4 : 7")).toBe("4 : 7로");
  });

  it("언어 코드를 고른다", () => {
    expect(toMathLang("ko")).toBe("ko");
    expect(toMathLang("ko-KR")).toBe("ko");
    expect(toMathLang("ja")).toBe("en");
    expect(toMathLang(undefined)).toBe("en");
  });

  for (const kind of MATH_PROBLEM_KINDS) {
    it(`${kind}: 두 언어로 단원·문장·힌트·풀이를 만들고 풀이에 정답이 나온다`, () => {
      const rng = seeded(kind.length * 31);
      for (const level of [1, 2, 3, 4] as Level[]) {
        for (let i = 0; i < 20; i++) {
          const p = generateProblemOfKind(kind, level, rng);
          for (const lang of ["ko", "en"] as const) {
            const t = formatProblem(p, lang, ["피카츄"]);
            const all = `${t.category}|${t.question}|${t.hint}|${t.explanation}`;
            expect(t.category.length).toBeGreaterThan(1);
            expect(t.question.length).toBeGreaterThan(5);
            expect(t.hint.length).toBeGreaterThan(5);
            expect(t.explanation).toContain(String(p.answer));
            expect(all).not.toMatch(/undefined|NaN|\[object/);
          }
        }
      }
    });
  }

  it("한국어 문장 예시", () => {
    const p = generateProblemOfKind("share2", 1, seeded(5));
    const t = formatProblem(p, "ko", ["꼬부기", "이브이"]);
    expect(t.question).toMatch(/꼬부기[와과] 이브이에게/);
    expect(t.category).toBe("비례배분");
  });
});
