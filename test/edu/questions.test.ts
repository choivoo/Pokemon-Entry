import { SENTENCES, WORDS } from "#app/edu/bank-english";
import { DIFFICULTIES, DIFFICULTY_RULES, levelForWave, pointsFor } from "#app/edu/difficulty";
import { MATH_GENS, MATH_TERMS } from "#app/edu/math-curriculum";
import { checkQuestionAnswer, type Level, type Question, SUBJECTS, termIndex } from "#app/edu/question";
import { pickQuestion, termCategories } from "#app/edu/select";
import { seeded } from "#test/math/seeded-rng";
import { describe, expect, it } from "vitest";

const BAD = /undefined|NaN|\[object|null/;

function validate(q: Question): void {
  const ctx = JSON.stringify(q);
  expect(q.prompt.trim().length, ctx).toBeGreaterThan(3);
  expect(q.hint.trim().length, ctx).toBeGreaterThan(3);
  expect(q.explanation.trim().length, ctx).toBeGreaterThan(2);
  expect(q.category.length, ctx).toBeGreaterThan(1);
  expect(`${q.prompt}|${q.hint}|${q.explanation}|${q.choices?.join("|") ?? ""}`, ctx).not.toMatch(BAD);
  if (q.choices) {
    expect(q.choices.length, ctx).toBeGreaterThanOrEqual(2);
    expect(q.choices.length, ctx).toBeLessThanOrEqual(4);
    expect(new Set(q.choices).size, ctx).toBe(q.choices.length);
    expect(
      q.choices.every(c => c.trim().length > 0),
      ctx,
    ).toBe(true);
    expect(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length, ctx).toBe(true);
    // 정답 선택지가 입력으로 판정된다
    expect(checkQuestionAnswer(q, String(q.answer + 1)), ctx).toBe(true);
    expect(checkQuestionAnswer(q, String(((q.answer + 1) % q.choices.length) + 1)), ctx).toBe(false);
  } else {
    expect(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 999999, ctx).toBe(true);
    expect(q.explanation, ctx).toContain(String(q.answer));
    expect(checkQuestionAnswer(q, String(q.answer)), ctx).toBe(true);
    expect(checkQuestionAnswer(q, String(q.answer + 1)), ctx).toBe(false);
  }
}

describe("국영수 문제: 모든 학기 · 과목 · 수준", () => {
  for (const subject of SUBJECTS) {
    it(`${subject}: 1학년 1학기 ~ 6학년 2학기, 수준 1~4 모두 올바른 문제를 만든다`, () => {
      const rng = seeded(subject.length * 1009);
      const kinds = new Set<string>();
      for (let grade = 1; grade <= 6; grade++) {
        for (const semester of [1, 2]) {
          for (const difficulty of DIFFICULTIES) {
            for (let i = 0; i < 40; i++) {
              const q = pickQuestion({
                subject,
                grade,
                semester,
                difficulty,
                wave: 1 + i * 3,
                rng,
                names: ["피카츄", "이브이"],
              });
              expect(q.subject).toBe(subject);
              validate(q);
              kinds.add(q.kind);
            }
          }
        }
      }
      console.log(subject, "유형 수:", kinds.size);
      expect(kinds.size).toBeGreaterThanOrEqual(subject === "math" ? 60 : subject === "kor" ? 12 : 6);
    });
  }

  it("학기마다 단원 목록이 있다", () => {
    for (const subject of SUBJECTS) {
      for (let term = 0; term < 12; term++) {
        expect(termCategories(subject, term).length, `${subject} ${term}`).toBeGreaterThan(1);
      }
    }
  });

  it("수학 생성기: 학기별 목록에 있는 이름은 모두 존재한다", () => {
    for (const ids of MATH_TERMS) {
      for (const id of ids) {
        expect(id.startsWith("ratio:") || id in MATH_GENS, id).toBe(true);
      }
    }
    // 학기마다 새 유형이 있다
    expect(Object.keys(MATH_GENS).length).toBeGreaterThan(70);
  });

  it("직전 유형을 되도록 피한다", () => {
    const rng = seeded(5);
    let same = 0;
    for (let i = 0; i < 200; i++) {
      const q = pickQuestion({
        subject: "math",
        grade: 4,
        semester: 1,
        difficulty: "normal",
        wave: 5,
        rng,
        exclude: "mul3x2",
      });
      if (q.kind === "mul3x2") {
        same++;
      }
    }
    expect(same).toBe(0);
  });
});

describe("수학 생성기: 계산이 맞는지 따로 검사", () => {
  const rng = seeded(77);
  const run = (id: string, lv: Level = 2) => MATH_GENS[id](rng, lv);
  const nums = (s: string) => (s.match(/\d+/g) ?? []).map(Number);

  it("곱셈구구 · 세 자리 덧셈/뺄셈 · 곱셈 · 나눗셈", () => {
    for (let i = 0; i < 100; i++) {
      let q = run("gugu");
      let [a, b] = nums(q.prompt);
      expect(q.answer).toBe(a * b);
      q = run("add3");
      [a, b] = nums(q.prompt);
      expect(q.answer).toBe(a + b);
      expect(q.answer).toBeLessThan(1000);
      q = run("sub3");
      [a, b] = nums(q.prompt);
      expect(q.answer).toBe(a - b);
      q = run("mul2x2");
      [a, b] = nums(q.prompt);
      expect(q.answer).toBe(a * b);
      q = run("mul3x2");
      [a, b] = nums(q.prompt);
      expect(q.answer).toBe(a * b);
      q = run("div1");
      [a, b] = nums(q.prompt);
      expect(q.answer).toBe(a / b);
      q = run("div3x2");
      [a, b] = nums(q.prompt);
      expect(q.answer * b).toBe(a);
    }
  });

  it("나머지 · 약수 · 최대공약수 · 최소공배수", () => {
    const g = (a: number, b: number): number => (b === 0 ? a : g(b, a % b));
    for (let i = 0; i < 100; i++) {
      let q = run("remainder");
      let [a, b] = nums(q.prompt);
      expect(q.prompt.includes("나머지") ? a % b : Math.floor(a / b)).toBe(q.answer);
      q = run("divisorCount");
      [a] = nums(q.prompt);
      expect(q.answer).toBe(Array.from({ length: a }, (_, k) => k + 1).filter(d => a % d === 0).length);
      q = run("gcdQ");
      [a, b] = nums(q.prompt);
      expect(q.answer).toBe(g(a, b));
      q = run("lcmQ");
      [a, b] = nums(q.prompt);
      expect(q.answer).toBe((a * b) / g(a, b));
    }
  });

  it("넓이 · 부피 · 각도 · 평균", () => {
    for (let i = 0; i < 100; i++) {
      let q = run("areaTriangle");
      let n = nums(q.prompt);
      expect(q.answer).toBe((n[0] * n[1]) / 2);
      q = run("areaTrapezoid");
      n = nums(q.prompt);
      expect(q.answer).toBe(((n[0] + n[1]) * n[2]) / 2);
      q = run("volume");
      n = nums(q.prompt);
      expect(q.answer).toBe(n[0] * n[1] * n[2]);
      q = run("cuboidSurface");
      n = nums(q.prompt);
      expect(q.answer).toBe(2 * (n[0] * n[1] + n[1] * n[2] + n[2] * n[0]));
      q = run("angleTriangle");
      n = nums(q.prompt);
      expect(q.answer + n[0] + n[1]).toBe(180);
      q = run("angleQuad");
      n = nums(q.prompt);
      expect(q.answer + n[0] + n[1] + n[2]).toBe(360);
      q = run("mean");
      n = nums(q.prompt);
      expect(n.reduce((x, y) => x + y, 0) / n.length).toBe(q.answer);
    }
  });

  it("분수의 덧셈: 정답 선택지가 올바른 값이다", () => {
    for (let i = 0; i < 100; i++) {
      const q = run("fracAdd");
      const [a, d, b] = nums(q.prompt);
      expect(q.choices![q.answer]).toBe(`${a + b}/${d}`);
      const s = run("fracSub");
      const [x, e, y] = nums(s.prompt);
      expect(s.choices![s.answer]).toBe(`${x - y}/${e}`);
    }
  });

  it("소수 곱셈 · 소수 나눗셈 · 백분율", () => {
    for (let i = 0; i < 100; i++) {
      const q = run("decTimesNat");
      const m = q.prompt.match(/([\d.]+) × (\d+)/)!;
      expect(Number(q.choices![q.answer])).toBeCloseTo(Number(m[1]) * Number(m[2]), 5);
      const d = run("decDivDec");
      const m2 = d.prompt.match(/([\d.]+) ÷ ([\d.]+)/)!;
      expect(Number(m2[1]) / Number(m2[2])).toBeCloseTo(d.answer, 5);
    }
  });
});

describe("영어 · 국어 자료", () => {
  it("영어 단어: 같은 철자가 중복되지 않고 학기별로 충분하다", () => {
    const en = WORDS.map(w => w.en);
    expect(new Set(en).size).toBe(en.length);
    expect(WORDS.length).toBeGreaterThan(250);
    expect(WORDS.every(w => w.ko.length > 0)).toBe(true);
  });

  it("영어 문장 문제: 정답이 오답에 섞이지 않는다", () => {
    for (const s of SENTENCES) {
      expect(s.wrong, s.q).not.toContain(s.a);
      expect(new Set(s.wrong).size, s.q).toBe(s.wrong.length);
      expect(s.from).toBeLessThanOrEqual(s.to);
    }
    expect(SENTENCES.length).toBeGreaterThan(55);
  });
});

describe("난이도", () => {
  it("이지 · 노멀 · 하드 · 익스트림 4단계, 어려울수록 규칙이 엄격하고 점수가 크다", () => {
    expect(DIFFICULTIES).toEqual(["easy", "normal", "hard", "extreme"]);
    const rules = DIFFICULTIES.map(d => DIFFICULTY_RULES[d]);
    for (let i = 1; i < rules.length; i++) {
      expect(rules[i].maxMisses).toBeLessThan(rules[i - 1].maxMisses);
      expect(rules[i].scoreMultiplier).toBeGreaterThan(rules[i - 1].scoreMultiplier);
      expect(rules[i].levelOffset).toBeGreaterThan(rules[i - 1].levelOffset);
    }
    expect(DIFFICULTY_RULES.extreme.hints).toBe(0);
    expect(DIFFICULTY_RULES.extreme.timeLimit).not.toBeNull();
  });

  it("수준은 1~4로 제한되고, 난이도가 높으면 같은 층에서도 어렵다", () => {
    for (const d of DIFFICULTIES) {
      for (const w of [1, 15, 50, 200]) {
        const lv = levelForWave(w, d);
        expect(lv >= 1 && lv <= 4).toBe(true);
      }
    }
    expect(levelForWave(1, "easy")).toBe(1);
    expect(levelForWave(1, "extreme")).toBe(3);
    expect(levelForWave(100, "extreme")).toBe(4);
  });

  it("점수: 한 번에 맞히고 어려울수록 많이 받는다", () => {
    expect(pointsFor(2, "normal", true, 0)).toBeGreaterThan(pointsFor(2, "normal", false, 0));
    expect(pointsFor(2, "extreme", true, 0)).toBeGreaterThan(pointsFor(2, "easy", true, 0));
    expect(pointsFor(2, "easy", true, 10)).toBeGreaterThan(pointsFor(2, "easy", true, 0));
  });

  it("학기 번호", () => {
    expect(termIndex(1, 1)).toBe(0);
    expect(termIndex(6, 2)).toBe(11);
  });
});
