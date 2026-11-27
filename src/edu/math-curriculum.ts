/**
 * 수학 문제 생성기 (초등 1학년 1학기 ~ 6학년 2학기).
 * 학기마다 그 학기 교과서 단원에 맞는 유형을 연결한다. (단원 구성은 학교 교과서와 조금 다를 수 있다)
 * 6학년 2학기의 비례식·비례배분은 `src/math/math-problems.ts` 에서 이어 받는다.
 */

import { choiceQ, type Level, numQ, type Question, type QuestionBase, shuffle } from "#app/edu/question";
import { gcd, lcm, pick, type Rng, randInt } from "#app/math/math-problems";
import { josa } from "#app/math/math-text";

export type MathGen = (rng: Rng, lv: Level) => Question;

const mk = (kind: string, category: string, level: Level): QuestionBase => ({
  subject: "math",
  kind,
  category,
  level,
});
const r = randInt;
/** 수준(1~4)에 따라 범위를 고른다 */
const by = <T>(lv: Level, values: [T, T, T, T]): T => values[lv - 1];
/** 10배 값(정수)을 소수 한 자리 글자로 */
export const dec = (tenths: number): string => (tenths % 10 === 0 ? String(tenths / 10) : (tenths / 10).toFixed(1));

type Gen = (rng: Rng, lv: Level) => Question;

/** 이름 → 생성기. 이름 앞의 숫자는 처음 나오는 학기(0 = 1학년 1학기). */
export const MATH_GENS: Record<string, Gen> = {
  // #region 1학년 1학기 — 9까지의 수, 덧셈과 뺄셈
  next: (rng, lv) => {
    const a = r(rng, 2, 8);
    const up = rng() < 0.5;
    return numQ(
      mk("next", "9까지의 수", lv),
      up ? `${a} 바로 다음 수는?` : `${a} 바로 앞의 수는?`,
      up ? a + 1 : a - 1,
      "",
      up ? `${a}에서 하나 더 세어 보세요.` : `${a}에서 하나 덜 세어 보세요.`,
      up ? `${a} 다음 수는 ${a + 1}` : `${a} 앞의 수는 ${a - 1}`,
    );
  },
  add9: (rng, lv) => {
    if (lv >= 3) {
      const a = r(rng, 1, 5);
      const b = r(rng, 1, Math.min(5, 8 - a));
      const c = r(rng, 1, 9 - a - b);
      return numQ(
        mk("add9", "덧셈과 뺄셈", lv),
        `${a} + ${b} + ${c} = □`,
        a + b + c,
        "",
        "앞에서부터 차례로 더해요.",
        `${a} + ${b} = ${a + b}, ${a + b} + ${c} = ${a + b + c}`,
      );
    }
    const a = r(rng, 1, 8);
    const b = r(rng, 1, 9 - a);
    return numQ(
      mk("add9", "덧셈과 뺄셈", lv),
      `${a} + ${b} = □`,
      a + b,
      "",
      `${a}에서 ${b}만큼 더 세어 보세요.`,
      `${a} + ${b} = ${a + b}`,
    );
  },
  sub9: (rng, lv) => {
    const a = r(rng, 2, 9);
    const b = r(rng, 1, a - 1);
    return numQ(
      mk("sub9", "덧셈과 뺄셈", lv),
      `${a} - ${b} = □`,
      a - b,
      "",
      `${a}에서 ${b}만큼 거꾸로 세어 보세요.`,
      `${a} - ${b} = ${a - b}`,
    );
  },
  compare9: (rng, lv) => {
    const nums = shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4);
    const big = rng() < 0.5;
    const target = big ? Math.max(...nums) : Math.min(...nums);
    return choiceQ(
      rng,
      mk("compare9", "9까지의 수", lv),
      `${nums.join(", ")} 중 가장 ${big ? "큰" : "작은"} 수는?`,
      String(target),
      nums.map(String),
      "수를 하나씩 비교해 보세요.",
      `가장 ${big ? "큰" : "작은"} 수는 ${target}`,
    );
  },
  // #endregion

  // #region 1학년 2학기 — 100까지의 수, 받아올림이 있는 덧셈, 시계
  tens: (rng, lv) => {
    const a = r(rng, 1, 9);
    const b = r(rng, 0, 9);
    return numQ(
      mk("tens", "100까지의 수", lv),
      `10개씩 묶음 ${a}개와 낱개 ${b}개는 □`,
      a * 10 + b,
      "",
      "10개씩 묶음 1개는 10이에요.",
      `${a}0 + ${b} = ${a * 10 + b}`,
    );
  },
  add20: (rng, lv) => {
    const a = r(rng, 3, 9);
    const b = r(rng, Math.max(2, 11 - a), 9);
    return numQ(
      mk("add20", "덧셈과 뺄셈(2)", lv),
      `${a} + ${b} = □`,
      a + b,
      "",
      `10을 먼저 만들어 보세요. ${a} + ${10 - a} = 10`,
      `${a} + ${b} = ${a + b}`,
    );
  },
  sub20: (rng, lv) => {
    const a = r(rng, 3, 9);
    const b = r(rng, Math.max(2, 11 - a), 9);
    return numQ(
      mk("sub20", "덧셈과 뺄셈(2)", lv),
      `${a + b} - ${a} = □`,
      b,
      "",
      "10에서 먼저 빼 보세요.",
      `${a + b} - ${a} = ${b}`,
    );
  },
  add2d1d: (rng, lv) => {
    const ones = r(rng, 0, 5);
    const a = r(rng, 1, 9) * 10 + ones;
    const b = r(rng, 1, 9 - ones);
    return numQ(
      mk("add2d1d", "덧셈과 뺄셈(3)", lv),
      `${a} + ${b} = □`,
      a + b,
      "",
      "낱개끼리 더해요.",
      `${ones} + ${b} = ${ones + b} → ${a + b}`,
    );
  },
  clock: (rng, lv) => {
    const h = r(rng, 1, 12);
    return rng() < 0.5
      ? numQ(
          mk("clock", "시계 보기", lv),
          `짧은바늘이 ${h}, 긴바늘이 12를 가리키는 시각은 □시`,
          h,
          "시",
          "긴바늘이 12이면 정각이에요.",
          `짧은바늘이 ${h}, 긴바늘이 12이므로 ${h}시 정각`,
        )
      : numQ(
          mk("clock", "시계 보기", lv),
          `짧은바늘이 ${h}와 ${(h % 12) + 1} 사이, 긴바늘이 6을 가리키는 시각은 ${h}시 □분`,
          30,
          "분",
          "긴바늘이 6이면 30분이에요.",
          `긴바늘이 6을 가리키면 30분이므로 ${h}시 30분`,
        );
  },
  // #endregion

  // #region 2학년 1학기 — 세 자리 수, 받아올림·받아내림, 곱셈의 시작
  place3: (rng, lv) => {
    const n = r(rng, 1, 9) * 100 + r(rng, 0, 9) * 10 + r(rng, 0, 9);
    const pos = pick(rng, [
      ["백", 0],
      ["십", 1],
      ["일", 2],
    ] as const);
    const digit = Number(String(n)[pos[1]]);
    return numQ(
      mk("place3", "세 자리 수", lv),
      `${n}에서 ${pos[0]}의 자리 숫자는?`,
      digit,
      "",
      `${n}을 백, 십, 일의 자리로 나누어 보세요.`,
      `${n}의 ${pos[0]}의 자리는 ${digit}`,
    );
  },
  add2dCarry: (rng, lv) => {
    const a1 = r(rng, 2, 9);
    const b1 = r(rng, 10 - a1, 9);
    const a10 = r(rng, 1, 7);
    const b10 = r(rng, 1, 8 - a10);
    const a = a10 * 10 + a1;
    const b = b10 * 10 + b1;
    return numQ(
      mk("add2dCarry", "덧셈과 뺄셈", lv),
      `${a} + ${b} = □`,
      a + b,
      "",
      "낱개의 합이 10이 넘으면 10을 윗자리로 올려요.",
      `${a} + ${b} = ${a + b}`,
    );
  },
  sub2dBorrow: (rng, lv) => {
    const a10 = r(rng, 2, 9);
    const a1 = r(rng, 0, 8);
    const b1 = r(rng, a1 + 1, 9);
    const b10 = r(rng, 1, a10 - 1);
    const a = a10 * 10 + a1;
    const b = b10 * 10 + b1;
    return numQ(
      mk("sub2dBorrow", "덧셈과 뺄셈", lv),
      `${a} - ${b} = □`,
      a - b,
      "",
      "낱개를 뺄 수 없으면 10을 내려서 계산해요.",
      `${a} - ${b} = ${a - b}`,
    );
  },
  times: (rng, lv) => {
    const b = r(rng, 2, by(lv, [5, 7, 9, 9]));
    const k = r(rng, 2, by(lv, [5, 7, 9, 9]));
    return numQ(
      mk("times", "곱셈", lv),
      `${b * k}은 ${b}의 □배입니다.`,
      k,
      "배",
      `${b}를 몇 번 더하면 ${b * k}이 될까요?`,
      `${b} × ${k} = ${b * k}`,
    );
  },
  make100: (rng, lv) => {
    const n = r(rng, 11, 89);
    return numQ(
      mk("make100", "세 자리 수", lv),
      `□ + ${n} = 100`,
      100 - n,
      "",
      `100에서 ${n}을 빼 보세요.`,
      `100 - ${n} = ${100 - n}`,
    );
  },
  // #endregion

  // #region 2학년 2학기 — 곱셈구구, 네 자리 수, 길이·시간
  gugu: (rng, lv) => {
    const max = by(lv, [5, 7, 9, 9]);
    const a = r(rng, 2, max);
    const b = r(rng, 2, max);
    return numQ(
      mk("gugu", "곱셈구구", lv),
      `${a} × ${b} = □`,
      a * b,
      "",
      `${a}단을 외워 보세요.`,
      `${a} × ${b} = ${a * b}`,
    );
  },
  guguInv: (rng, lv) => {
    const a = r(rng, 2, 9);
    const b = r(rng, 2, by(lv, [5, 7, 9, 9]));
    return numQ(
      mk("guguInv", "곱셈구구", lv),
      `□ × ${a} = ${a * b}`,
      b,
      "",
      `${a}단에서 ${a * b}을 찾아보세요.`,
      `${a} × ${b} = ${a * b}`,
    );
  },
  place4: (rng, lv) => {
    const [a, b, c, d] = [r(rng, 1, 9), r(rng, 0, 9), r(rng, 0, 9), r(rng, 0, 9)];
    return numQ(
      mk("place4", "네 자리 수", lv),
      `천의 자리 ${a}, 백의 자리 ${b}, 십의 자리 ${c}, 일의 자리 ${d}인 수는?`,
      a * 1000 + b * 100 + c * 10 + d,
      "",
      "자리 순서대로 이어 써 보세요.",
      `${a}${b}${c}${d}`,
    );
  },
  lengthMCm: (rng, lv) => {
    const a = r(rng, 1, 9);
    const b = r(rng, 1, by(lv, [3, 5, 9, 9])) * 10 + (lv >= 3 ? r(rng, 0, 9) : 0);
    return numQ(
      mk("lengthMCm", "길이 재기", lv),
      `${a}m ${b}cm = □cm`,
      a * 100 + b,
      "cm",
      "1m = 100cm",
      `${a}00 + ${b} = ${a * 100 + b}`,
    );
  },
  timeMin: (rng, lv) => {
    const h = r(rng, 1, 3);
    const m = r(rng, 1, 11) * 5;
    return numQ(
      mk("timeMin", "시각과 시간", lv),
      `${h}시간 ${m}분 = □분`,
      h * 60 + m,
      "분",
      "1시간 = 60분",
      `${h * 60} + ${m} = ${h * 60 + m}`,
    );
  },
  // #endregion

  // #region 3학년 1학기 — 덧셈과 뺄셈, 나눗셈, 곱셈, 분수, 길이와 시간
  add3: (rng, lv) => {
    const step = by(lv, [100, 10, 1, 1]);
    const a = Math.floor(r(rng, 100, 700) / step) * step;
    const b = Math.floor(r(rng, 100, 999 - a) / step) * step;
    return numQ(
      mk("add3", "덧셈과 뺄셈", lv),
      `${a} + ${b} = □`,
      a + b,
      "",
      "같은 자리끼리 더해요.",
      `${a} + ${b} = ${a + b}`,
    );
  },
  sub3: (rng, lv) => {
    const step = by(lv, [100, 10, 1, 1]);
    const a = Math.floor(r(rng, 300, 999) / step) * step;
    const b = Math.floor(r(rng, 100, a - 50) / step) * step;
    return numQ(
      mk("sub3", "덧셈과 뺄셈", lv),
      `${a} - ${b} = □`,
      a - b,
      "",
      "같은 자리끼리 빼요. 모자라면 윗자리에서 내려요.",
      `${a} - ${b} = ${a - b}`,
    );
  },
  div1: (rng, lv) => {
    const b = r(rng, 2, 9);
    const q = r(rng, 2, by(lv, [5, 9, 9, 12]));
    return numQ(
      mk("div1", "나눗셈", lv),
      `${b * q} ÷ ${b} = □`,
      q,
      "",
      `${b}단에서 ${b * q}을 찾아보세요.`,
      `${b} × ${q} = ${b * q} 이므로 ${b * q} ÷ ${b} = ${q}`,
    );
  },
  mul2x1: (rng, lv) => {
    const a = r(rng, 11, by(lv, [19, 29, 49, 99]));
    const b = r(rng, 2, 9);
    return numQ(
      mk("mul2x1", "곱셈", lv),
      `${a} × ${b} = □`,
      a * b,
      "",
      "십의 자리와 일의 자리를 따로 곱해서 더해요.",
      `${a} × ${b} = ${a * b}`,
    );
  },
  fracOfSet: (rng, lv) => {
    const d = r(rng, 2, 6);
    const p = r(rng, 1, d - 1);
    const unit = r(rng, 2, by(lv, [4, 6, 8, 9]));
    return numQ(
      mk("fracOfSet", "분수", lv),
      `${d * unit}개를 똑같이 ${d}묶음으로 나누었습니다. ${p}묶음은 모두 몇 개일까요?`,
      unit * p,
      "개",
      "먼저 한 묶음이 몇 개인지 구해 보세요.",
      `${d * unit} ÷ ${d} = ${unit}, ${unit} × ${p} = ${unit * p}`,
    );
  },
  unitConvert1: (rng, lv) => {
    if (rng() < 0.5) {
      const a = r(rng, 1, 5);
      const b = r(rng, 1, 9) * 100;
      return numQ(
        mk("unitConvert1", "길이와 시간", lv),
        `${a}km ${b}m = □m`,
        a * 1000 + b,
        "m",
        "1km = 1000m",
        `${a * 1000} + ${b} = ${a * 1000 + b}`,
      );
    }
    const m = r(rng, 1, 5);
    const s = r(rng, 1, 11) * 5;
    return numQ(
      mk("unitConvert1", "길이와 시간", lv),
      `${m}분 ${s}초 = □초`,
      m * 60 + s,
      "초",
      "1분 = 60초",
      `${m * 60} + ${s} = ${m * 60 + s}`,
    );
  },
  // #endregion

  // #region 3학년 2학기 — 곱셈, 나눗셈, 원, 분수, 들이와 무게
  mul2x2: (rng, lv) => {
    const a = r(rng, 11, by(lv, [20, 30, 45, 60]));
    const b = r(rng, 11, by(lv, [15, 25, 35, 50]));
    return numQ(
      mk("mul2x2", "곱셈", lv),
      `${a} × ${b} = □`,
      a * b,
      "",
      `${a} × ${b % 10}와 ${a} × ${Math.floor(b / 10) * 10}을 더해요.`,
      `${a} × ${b} = ${a * b}`,
    );
  },
  remainder: (rng, lv) => {
    const b = r(rng, 3, 9);
    const q = r(rng, 3, by(lv, [9, 12, 15, 20]));
    const rem = r(rng, 1, b - 1);
    const a = b * q + rem;
    return rng() < 0.6
      ? numQ(
          mk("remainder", "나눗셈", lv),
          `${a} ÷ ${b}의 나머지는?`,
          rem,
          "",
          `${b} × □가 ${a}보다 작은 가장 큰 수를 찾아보세요.`,
          `${a} = ${b} × ${q} + ${rem}`,
        )
      : numQ(
          mk("remainder", "나눗셈", lv),
          `${a} ÷ ${b}의 몫은?`,
          q,
          "",
          `${b} × □가 ${a}보다 작은 가장 큰 수를 찾아보세요.`,
          `${a} = ${b} × ${q} + ${rem}`,
        );
  },
  circle: (rng, lv) => {
    const rad = r(rng, 2, by(lv, [9, 15, 25, 50]));
    return rng() < 0.5
      ? numQ(
          mk("circle", "원 알아보기", lv),
          `반지름이 ${rad}cm인 원의 지름은 □cm`,
          rad * 2,
          "cm",
          "지름은 반지름의 2배예요.",
          `${rad} × 2 = ${rad * 2}`,
        )
      : numQ(
          mk("circle", "원 알아보기", lv),
          `지름이 ${rad * 2}cm인 원의 반지름은 □cm`,
          rad,
          "cm",
          "반지름은 지름의 반이에요.",
          `${rad * 2} ÷ 2 = ${rad}`,
        );
  },
  capacity: (rng, lv) => {
    if (rng() < 0.5) {
      const a = r(rng, 1, 5);
      const b = r(rng, 1, 9) * 100;
      return numQ(
        mk("capacity", "들이와 무게", lv),
        `${a}L ${b}mL = □mL`,
        a * 1000 + b,
        "mL",
        "1L = 1000mL",
        `${a * 1000} + ${b} = ${a * 1000 + b}`,
      );
    }
    const a = r(rng, 1, 5);
    const b = r(rng, 1, 9) * 100;
    return numQ(
      mk("capacity", "들이와 무게", lv),
      `${a}kg ${b}g = □g`,
      a * 1000 + b,
      "g",
      "1kg = 1000g",
      `${a * 1000} + ${b} = ${a * 1000 + b}`,
    );
  },
  fracCompare: (rng, lv) => {
    const big = rng() < 0.5;
    if (lv <= 2) {
      const d = r(rng, 5, 12);
      const ns = shuffle(
        rng,
        Array.from({ length: d - 1 }, (_, i) => i + 1),
      ).slice(0, 3);
      const t = big ? Math.max(...ns) : Math.min(...ns);
      return choiceQ(
        rng,
        mk("fracCompare", "분수", lv),
        `${ns.map(n => `${n}/${d}`).join(", ")} 중 가장 ${big ? "큰" : "작은"} 분수는?`,
        `${t}/${d}`,
        ns.map(n => `${n}/${d}`),
        "분모가 같으면 분자가 클수록 커요.",
        `분모가 ${d}로 같으므로 분자가 ${big ? "가장 큰" : "가장 작은"} ${t}/${d}`,
      );
    }
    const ds = shuffle(rng, [2, 3, 4, 5, 6, 7, 8, 9, 10, 12]).slice(0, 3);
    const t = big ? Math.min(...ds) : Math.max(...ds);
    return choiceQ(
      rng,
      mk("fracCompare", "분수", lv),
      `${ds.map(d => `1/${d}`).join(", ")} 중 가장 ${big ? "큰" : "작은"} 분수는?`,
      `1/${t}`,
      ds.map(d => `1/${d}`),
      "단위분수는 분모가 작을수록 커요.",
      `분모가 ${big ? "가장 작은" : "가장 큰"} 1/${t}`,
    );
  },
  // #endregion

  // #region 4학년 1학기 — 큰 수, 각도, 곱셈과 나눗셈, 규칙 찾기
  bigNum: (rng, lv) => {
    const a = r(rng, 1, by(lv, [9, 99, 99, 99]));
    const b = r(rng, 1, 9);
    return numQ(
      mk("bigNum", "큰 수", lv),
      `${a}만 ${b}천을 수로 쓰면?`,
      a * 10000 + b * 1000,
      "",
      "1만 = 10000, 1천 = 1000",
      `${a * 10000} + ${b * 1000} = ${a * 10000 + b * 1000}`,
    );
  },
  angleTriangle: (rng, lv) => {
    const a = r(rng, 30, 90);
    const b = r(rng, 20, Math.min(80, 170 - a));
    return numQ(
      mk("angleTriangle", "각도", lv),
      `삼각형의 두 각이 ${a}°, ${b}°일 때 나머지 한 각은 □°`,
      180 - a - b,
      "°",
      "삼각형의 세 각의 합은 180°예요.",
      `180 - ${a} - ${b} = ${180 - a - b}`,
    );
  },
  angleLine: (rng, lv) => {
    const a = r(rng, 20, 160);
    return numQ(
      mk("angleLine", "각도", lv),
      `한 직선 위에서 ${a}°와 □°를 합치면 직선입니다.`,
      180 - a,
      "°",
      "직선의 각도는 180°예요.",
      `180 - ${a} = ${180 - a}`,
    );
  },
  mul3x2: (rng, lv) => {
    const a = r(rng, 101, by(lv, [199, 299, 499, 899]));
    const b = r(rng, 11, by(lv, [19, 25, 29, 49]));
    return numQ(
      mk("mul3x2", "곱셈", lv),
      `${a} × ${b} = □`,
      a * b,
      "",
      "십의 자리 곱과 일의 자리 곱을 따로 구해 더해요.",
      `${a} × ${b} = ${a * b}`,
    );
  },
  div3x2: (rng, lv) => {
    const b = r(rng, 11, by(lv, [15, 20, 29, 39]));
    const q = r(rng, 5, Math.floor(990 / b));
    return numQ(
      mk("div3x2", "나눗셈", lv),
      `${b * q} ÷ ${b} = □`,
      q,
      "",
      `${b} × □ = ${b * q}`,
      `${b} × ${q} = ${b * q}`,
    );
  },
  pattern: (rng, lv) => {
    const f = r(rng, 1, 20);
    const d = r(rng, 2, by(lv, [5, 9, 15, 25]));
    return numQ(
      mk("pattern", "규칙 찾기", lv),
      `${[0, 1, 2, 3].map(i => f + d * i).join(", ")}, □`,
      f + d * 4,
      "",
      "이웃한 수의 차이를 구해 보세요.",
      `${d}씩 커지므로 ${f + d * 3} + ${d} = ${f + d * 4}`,
    );
  },
  // #endregion

  // #region 4학년 2학기 — 분수의 덧셈과 뺄셈, 소수, 삼각형, 사각형, 다각형
  fracAdd: (rng, lv) => {
    const d = r(rng, 5, by(lv, [9, 12, 15, 20]));
    const a = r(rng, 1, d - 2);
    const b = r(rng, 1, d - a - 1);
    return choiceQ(
      rng,
      mk("fracAdd", "분수의 덧셈과 뺄셈", lv),
      `${a}/${d} + ${b}/${d} = ?`,
      `${a + b}/${d}`,
      [`${a + b}/${d * 2}`, `${a + b + 1}/${d}`, `${a * b}/${d}`, `${a + b - 1}/${d}`],
      "분모가 같으면 분자끼리 더하고 분모는 그대로예요.",
      `${a} + ${b} = ${a + b} 이므로 ${a + b}/${d}`,
    );
  },
  fracSub: (rng, lv) => {
    const d = r(rng, 5, by(lv, [9, 12, 15, 20]));
    const a = r(rng, 2, d - 1);
    const b = r(rng, 1, a - 1);
    return choiceQ(
      rng,
      mk("fracSub", "분수의 덧셈과 뺄셈", lv),
      `${a}/${d} - ${b}/${d} = ?`,
      `${a - b}/${d}`,
      [`${a - b}/${d * 2}`, `${a - b + 1}/${d}`, `${a + b}/${d}`, `${a - b}/${d + 1}`],
      "분모가 같으면 분자끼리 빼고 분모는 그대로예요.",
      `${a} - ${b} = ${a - b} 이므로 ${a - b}/${d}`,
    );
  },
  mixedToImproper: (rng, lv) => {
    const q = r(rng, 3, by(lv, [5, 8, 9, 12]));
    const w = r(rng, 1, by(lv, [3, 5, 6, 9]));
    const p = r(rng, 1, q - 1);
    return numQ(
      mk("mixedToImproper", "분수의 덧셈과 뺄셈", lv),
      `대분수 ${josa(String(w), "과", "와")} ${p}/${q}를 가분수로 나타내면 □/${q}`,
      w * q + p,
      "",
      `자연수 ${w}를 ${q}분의 몇으로 바꿔 보세요.`,
      `${w} × ${q} + ${p} = ${w * q + p}`,
    );
  },
  decAdd: (rng, lv) => {
    const x = r(rng, 2, by(lv, [9, 19, 39, 59]));
    const y = r(rng, 2, by(lv, [9, 19, 39, 59]));
    return choiceQ(
      rng,
      mk("decAdd", "소수의 덧셈과 뺄셈", lv),
      `${dec(x)} + ${dec(y)} = ?`,
      dec(x + y),
      [dec(x + y + 1), dec(x + y - 1), String((x + y) / 100), dec(Math.abs(x - y) + 1)],
      "소수점의 자리를 맞추어 더해요.",
      `${dec(x)} + ${dec(y)} = ${dec(x + y)}`,
    );
  },
  isosceles: (rng, lv) => {
    const v = r(rng, 10, 50) * 2;
    return numQ(
      mk("isosceles", "삼각형", lv),
      `이등변삼각형의 꼭지각이 ${v}°일 때, 한 밑각은 □°`,
      (180 - v) / 2,
      "°",
      "세 각의 합 180°에서 꼭지각을 빼고 반으로 나누어요.",
      `(180 - ${v}) ÷ 2 = ${(180 - v) / 2}`,
    );
  },
  angleQuad: (rng, lv) => {
    const a = r(rng, 60, 120);
    const b = r(rng, 60, 120);
    const c = r(rng, 40, Math.min(150, 340 - a - b));
    return numQ(
      mk("angleQuad", "사각형", lv),
      `사각형의 세 각이 ${a}°, ${b}°, ${c}°일 때 나머지 한 각은 □°`,
      360 - a - b - c,
      "°",
      "사각형의 네 각의 합은 360°예요.",
      `360 - ${a} - ${b} - ${c} = ${360 - a - b - c}`,
    );
  },
  diagonals: (rng, lv) => {
    const n = r(rng, 4, by(lv, [6, 8, 10, 12]));
    return numQ(
      mk("diagonals", "다각형", lv),
      `${n}각형의 대각선은 모두 몇 개일까요?`,
      (n * (n - 3)) / 2,
      "개",
      "한 꼭짓점에서 그을 수 있는 대각선은 (꼭짓점 수 - 3)개예요.",
      `${n} × ${n - 3} ÷ 2 = ${(n * (n - 3)) / 2}`,
    );
  },
  barGraph: (rng, lv) => {
    const names = shuffle(rng, ["사과", "배", "귤", "감", "포도", "딸기"]).slice(0, 4);
    const vals = names.map(() => r(rng, 3, by(lv, [15, 30, 60, 90])));
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    return numQ(
      mk("barGraph", "막대그래프", lv),
      `좋아하는 과일: ${names.map((n, i) => `${n} ${vals[i]}명`).join(", ")}\n가장 많은 과일과 가장 적은 과일의 차는 몇 명?`,
      max - min,
      "명",
      "가장 큰 수에서 가장 작은 수를 빼요.",
      `${max} - ${min} = ${max - min}`,
    );
  },
  // #endregion

  // #region 5학년 1학기 — 약수와 배수, 약분과 통분, 규칙과 대응, 다각형의 넓이
  divisorCount: (rng, lv) => {
    const n = pick(
      rng,
      by(lv, [
        [6, 8, 10, 12],
        [12, 16, 18, 20],
        [24, 28, 30, 36],
        [40, 45, 48, 60],
      ]),
    );
    const count = Array.from({ length: n }, (_, i) => i + 1).filter(d => n % d === 0).length;
    return numQ(
      mk("divisorCount", "약수와 배수", lv),
      `${n}의 약수는 모두 몇 개일까요?`,
      count,
      "개",
      `${n}을 나누어떨어지게 하는 수를 모두 찾아보세요.`,
      `${n}의 약수: ${Array.from({ length: n }, (_, i) => i + 1)
        .filter(d => n % d === 0)
        .join(", ")} → ${count}개`,
    );
  },
  gcdQ: (rng, lv) => {
    const g = r(rng, 2, by(lv, [6, 9, 12, 15]));
    let p = r(rng, 2, 6);
    let q = r(rng, 2, 8);
    while (gcd(p, q) !== 1) {
      q = r(rng, 2, 8);
      p = r(rng, 2, 6);
    }
    return numQ(
      mk("gcdQ", "약수와 배수", lv),
      `${g * p}와 ${g * q}의 최대공약수는?`,
      gcd(g * p, g * q),
      "",
      "두 수를 모두 나누어떨어지게 하는 가장 큰 수예요.",
      `최대공약수 = ${gcd(g * p, g * q)}`,
    );
  },
  lcmQ: (rng, lv) => {
    const a = r(rng, 2, by(lv, [6, 9, 12, 15]));
    let b = r(rng, 2, by(lv, [6, 9, 12, 15]));
    while (b === a) {
      b = r(rng, 2, 12);
    }
    return numQ(
      mk("lcmQ", "약수와 배수", lv),
      `${a}와 ${b}의 최소공배수는?`,
      lcm(a, b),
      "",
      "두 수의 공통인 배수 중 가장 작은 수예요.",
      `최소공배수 = ${lcm(a, b)}`,
    );
  },
  multiplesCount: (rng, lv) => {
    const k = r(rng, 3, 9);
    const n = r(rng, 30, by(lv, [50, 80, 100, 200]));
    return numQ(
      mk("multiplesCount", "약수와 배수", lv),
      `${n} 이하의 수 중 ${k}의 배수는 모두 몇 개일까요?`,
      Math.floor(n / k),
      "개",
      `${n} ÷ ${k}의 몫이 배수의 개수예요.`,
      `${n} ÷ ${k} = ${Math.floor(n / k)} … ${n % k}`,
    );
  },
  reduce: (rng, lv) => {
    const g = r(rng, 2, by(lv, [4, 6, 8, 12]));
    let p = r(rng, 1, 7);
    let q = r(rng, 2, 9);
    while (p >= q || gcd(p, q) !== 1) {
      p = r(rng, 1, 7);
      q = r(rng, 2, 9);
    }
    const askNum = rng() < 0.5;
    return numQ(
      mk("reduce", "약분과 통분", lv),
      `${p * g}/${q * g}를 기약분수로 나타내면 ${askNum ? "분자" : "분모"}는?`,
      askNum ? p : q,
      "",
      `분자와 분모를 최대공약수로 나누어요. (최대공약수: ${g})`,
      `${p * g}/${q * g} = ${p}/${q}`,
    );
  },
  commonDenominator: (rng, lv) => {
    const b = r(rng, 2, by(lv, [6, 8, 10, 12]));
    let d = r(rng, 2, by(lv, [6, 8, 10, 12]));
    while (d === b) {
      d = r(rng, 2, 12);
    }
    const a = r(rng, 1, b - 1);
    const c = r(rng, 1, d - 1);
    return numQ(
      mk("commonDenominator", "약분과 통분", lv),
      `${a}/${b}와 ${c}/${d}를 통분할 때, 가장 작은 공통분모는?`,
      lcm(b, d),
      "",
      `${b}와 ${d}의 최소공배수를 구해요.`,
      `${b}와 ${d}의 최소공배수 = ${lcm(b, d)}`,
    );
  },
  correspondence: (rng, lv) => {
    const k = r(rng, 2, by(lv, [5, 7, 9, 12]));
    const n = r(rng, 3, by(lv, [8, 10, 12, 15]));
    return rng() < 0.5
      ? numQ(
          mk("correspondence", "규칙과 대응", lv),
          `탁자 1개에 의자가 ${k}개씩 놓입니다. 탁자가 ${n}개이면 의자는 □개`,
          k * n,
          "개",
          `의자 수 = 탁자 수 × ${k}`,
          `${n} × ${k} = ${k * n}`,
        )
      : numQ(
          mk("correspondence", "규칙과 대응", lv),
          `탁자 1개에 의자가 ${k}개씩 놓입니다. 의자가 ${k * n}개이면 탁자는 □개`,
          n,
          "개",
          `탁자 수 = 의자 수 ÷ ${k}`,
          `${k * n} ÷ ${k} = ${n}`,
        );
  },
  areaRect: (rng, lv) => {
    const a = r(rng, 3, by(lv, [9, 15, 25, 40]));
    const b = r(rng, 3, by(lv, [9, 15, 25, 40]));
    return numQ(
      mk("areaRect", "다각형의 넓이", lv),
      `가로 ${a}cm, 세로 ${b}cm인 직사각형의 넓이는?`,
      a * b,
      "cm²",
      "(가로) × (세로)",
      `${a} × ${b} = ${a * b}`,
    );
  },
  areaTriangle: (rng, lv) => {
    const b = r(rng, 2, by(lv, [8, 12, 20, 30])) * 2;
    const h = r(rng, 3, by(lv, [9, 15, 25, 30]));
    return numQ(
      mk("areaTriangle", "다각형의 넓이", lv),
      `밑변 ${b}cm, 높이 ${h}cm인 삼각형의 넓이는?`,
      (b * h) / 2,
      "cm²",
      "(밑변) × (높이) ÷ 2",
      `${b} × ${h} ÷ 2 = ${(b * h) / 2}`,
    );
  },
  areaParallelogram: (rng, lv) => {
    const b = r(rng, 3, by(lv, [9, 15, 25, 40]));
    const h = r(rng, 3, by(lv, [9, 15, 25, 40]));
    return numQ(
      mk("areaParallelogram", "다각형의 넓이", lv),
      `밑변 ${b}cm, 높이 ${h}cm인 평행사변형의 넓이는?`,
      b * h,
      "cm²",
      "(밑변) × (높이)",
      `${b} × ${h} = ${b * h}`,
    );
  },
  areaRhombus: (rng, lv) => {
    const d1 = r(rng, 2, by(lv, [8, 12, 20, 30])) * 2;
    const d2 = r(rng, 3, by(lv, [9, 15, 25, 30]));
    return numQ(
      mk("areaRhombus", "다각형의 넓이", lv),
      `두 대각선이 ${d1}cm, ${d2}cm인 마름모의 넓이는?`,
      (d1 * d2) / 2,
      "cm²",
      "(한 대각선) × (다른 대각선) ÷ 2",
      `${d1} × ${d2} ÷ 2 = ${(d1 * d2) / 2}`,
    );
  },
  areaTrapezoid: (rng, lv) => {
    const a = r(rng, 3, by(lv, [8, 12, 20, 30]));
    const b = r(rng, 3, by(lv, [8, 12, 20, 30]));
    const h = r(rng, 2, by(lv, [6, 10, 14, 20])) * ((a + b) % 2 === 0 ? 1 : 2);
    return numQ(
      mk("areaTrapezoid", "다각형의 넓이", lv),
      `윗변 ${a}cm, 아랫변 ${b}cm, 높이 ${h}cm인 사다리꼴의 넓이는?`,
      ((a + b) * h) / 2,
      "cm²",
      "{(윗변) + (아랫변)} × (높이) ÷ 2",
      `(${a} + ${b}) × ${h} ÷ 2 = ${((a + b) * h) / 2}`,
    );
  },
  perimeter: (rng, lv) => {
    const n = r(rng, 3, 8);
    const s = r(rng, 2, by(lv, [9, 15, 25, 40]));
    return numQ(
      mk("perimeter", "다각형의 둘레", lv),
      `한 변이 ${s}cm인 정${n}각형의 둘레는?`,
      n * s,
      "cm",
      "정다각형은 변의 길이가 모두 같아요. 둘레 = 변의 수 × 한 변",
      `${n} × ${s} = ${n * s}`,
    );
  },
  // #endregion

  // #region 5학년 2학기 — 수의 범위, 어림하기, 분수·소수의 곱셈, 평균, 직육면체
  rangeCount: (rng, lv) => {
    const a = r(rng, 1, by(lv, [20, 50, 80, 200]));
    const b = a + r(rng, 5, by(lv, [15, 30, 50, 100]));
    const t = r(rng, 0, 2);
    if (t === 0) {
      return numQ(
        mk("rangeCount", "수의 범위", lv),
        `${a} 이상 ${b} 이하인 자연수는 모두 몇 개일까요?`,
        b - a + 1,
        "개",
        "양 끝의 수도 모두 포함해요.",
        `${b} - ${a} + 1 = ${b - a + 1}`,
      );
    }
    if (t === 1) {
      return numQ(
        mk("rangeCount", "수의 범위", lv),
        `${a} 초과 ${b} 미만인 자연수는 모두 몇 개일까요?`,
        b - a - 1,
        "개",
        "양 끝의 수는 포함하지 않아요.",
        `${b} - ${a} - 1 = ${b - a - 1}`,
      );
    }
    return numQ(
      mk("rangeCount", "수의 범위", lv),
      `${a} 이상 ${b} 미만인 자연수는 모두 몇 개일까요?`,
      b - a,
      "개",
      "이상은 포함, 미만은 포함하지 않아요.",
      `${b} - ${a} = ${b - a}`,
    );
  },
  rounding: (rng, lv) => {
    const n = r(rng, by(lv, [101, 1001, 1001, 10001]), by(lv, [999, 9999, 9999, 99999]));
    const place = pick(rng, [10, 100]);
    const kind = pick(rng, ["올림", "버림", "반올림"] as const);
    if (n % place === 0) {
      return MATH_GENS.rounding(rng, lv);
    }
    const ans =
      kind === "올림"
        ? Math.ceil(n / place) * place
        : kind === "버림"
          ? Math.floor(n / place) * place
          : Math.round(n / place) * place;
    return numQ(
      mk("rounding", "어림하기", lv),
      `${n}을 ${place === 10 ? "십" : "백"}의 자리까지 나타내려고 합니다. ${kind}하면?`,
      ans,
      "",
      kind === "올림"
        ? "구하려는 자리 아래를 0으로 만들고 윗자리에 1을 더해요."
        : kind === "버림"
          ? "구하려는 자리 아래를 모두 0으로 바꿔요."
          : "바로 아래 자리가 5 이상이면 올리고, 4 이하면 버려요.",
      `${n} → ${ans}`,
    );
  },
  fracTimesNat: (rng, lv) => {
    const q = r(rng, 2, by(lv, [6, 9, 12, 15]));
    const p = r(rng, 1, q - 1);
    const m = r(rng, 2, by(lv, [4, 6, 8, 10]));
    return numQ(
      mk("fracTimesNat", "분수의 곱셈", lv),
      `${p}/${q} × ${q * m} = □`,
      p * m,
      "",
      `${q * m}을 ${q}로 먼저 나누어 보세요.`,
      `${q * m} ÷ ${q} = ${m}, ${m} × ${p} = ${p * m}`,
    );
  },
  decTimesNat: (rng, lv) => {
    const x = r(rng, 2, by(lv, [9, 19, 29, 39]));
    const n = r(rng, 2, 9);
    return choiceQ(
      rng,
      mk("decTimesNat", "소수의 곱셈", lv),
      `${dec(x)} × ${n} = ?`,
      dec(x * n),
      [dec(x * n + 1), dec(x * n - 1), String((x * n) / 100), String(x * n)],
      "소수를 자연수처럼 곱한 뒤 소수점을 찍어요.",
      `${dec(x)} × ${n} = ${dec(x * n)}`,
    );
  },
  mean: (rng, lv) => {
    const m = r(rng, 60, 95);
    const d = by(lv, [5, 10, 15, 20]);
    const d1 = r(rng, -d, d);
    const d2 = r(rng, -d, d);
    const d3 = r(rng, -d, d);
    const scores = [m + d1, m + d2, m + d3, m - d1 - d2 - d3];
    return numQ(
      mk("mean", "평균", lv),
      `네 번의 점수가 ${scores.join("점, ")}점일 때, 평균은?`,
      m,
      "점",
      "(점수의 합) ÷ (점수의 개수)",
      `${scores.join(" + ")} = ${m * 4}, ${m * 4} ÷ 4 = ${m}`,
    );
  },
  volume: (rng, lv) => {
    const [a, b, c] = [
      r(rng, 2, by(lv, [5, 8, 10, 15])),
      r(rng, 2, by(lv, [5, 8, 10, 12])),
      r(rng, 2, by(lv, [5, 8, 10, 12])),
    ];
    return numQ(
      mk("volume", "직육면체", lv),
      `가로 ${a}cm, 세로 ${b}cm, 높이 ${c}cm인 직육면체의 부피는?`,
      a * b * c,
      "cm³",
      "(가로) × (세로) × (높이)",
      `${a} × ${b} × ${c} = ${a * b * c}`,
    );
  },
  // #endregion

  // #region 6학년 1학기 — 분수·소수의 나눗셈, 비와 비율, 각기둥, 직육면체의 부피와 겉넓이
  fracDivNat: (rng, lv) => {
    const n = r(rng, 2, by(lv, [3, 5, 7, 9]));
    const m = r(rng, 1, 5);
    const q = r(rng, n + 1, by(lv, [9, 12, 15, 20]));
    return choiceQ(
      rng,
      mk("fracDivNat", "분수의 나눗셈", lv),
      `${n * m}/${q} ÷ ${n} = ?`,
      `${m}/${q}`,
      [`${m}/${q * n}`, `${n * m * n}/${q}`, `${m + 1}/${q}`, `${n * m}/${q + n}`],
      "분자가 나누는 수의 배수이면 분자를 먼저 나누어요.",
      `${n * m} ÷ ${n} = ${m} 이므로 ${m}/${q}`,
    );
  },
  natDivFrac: (rng, lv) => {
    const p = r(rng, 2, by(lv, [3, 4, 5, 7]));
    const q = r(rng, p + 1, by(lv, [5, 6, 8, 9]));
    const k = r(rng, 2, by(lv, [5, 8, 10, 12]));
    return numQ(
      mk("natDivFrac", "분수의 나눗셈", lv),
      `${p * k} ÷ ${p}/${q} = □`,
      k * q,
      "",
      "나누는 분수를 뒤집어서 곱해요.",
      `${p * k} × ${q}/${p} = ${k * q}`,
    );
  },
  decDivDec: (rng, lv) => {
    const d = r(rng, 2, 9);
    const q = r(rng, 2, by(lv, [9, 12, 20, 30]));
    return numQ(
      mk("decDivDec", "소수의 나눗셈", lv),
      `${dec(d * q)} ÷ ${dec(d)} = □`,
      q,
      "",
      "나누는 수와 나누어지는 수에 똑같이 10을 곱해요.",
      `${d * q} ÷ ${d} = ${q}`,
    );
  },
  percent: (rng, lv) => {
    const t = r(rng, 0, 2);
    if (t === 0) {
      const p = r(rng, 1, 99);
      return numQ(
        mk("percent", "비와 비율", lv),
        `비율 ${(p / 100).toFixed(2).replace(/0$/, "")}를 백분율로 나타내면 □%`,
        p,
        "%",
        "비율에 100을 곱해요.",
        `${p / 100} × 100 = ${p}`,
      );
    }
    if (t === 1) {
      const a = pick(rng, [4, 5, 10, 20, 25, 40, 50]);
      const cand = Array.from({ length: a - 1 }, (_, i) => i + 1).filter(b => (b * 100) % a === 0);
      const b = pick(rng, cand);
      return numQ(
        mk("percent", "비와 비율", lv),
        `전체 ${a}명 중 ${b}명은 몇 %일까요?`,
        (b * 100) / a,
        "%",
        "(비교하는 양) ÷ (기준량) × 100",
        `${b} ÷ ${a} × 100 = ${(b * 100) / a}`,
      );
    }
    const a = pick(rng, [20, 40, 60, 80, 100, 200, 300, 500]);
    const p = pick(
      rng,
      [10, 20, 25, 30, 40, 50, 60, 75].filter(x => (a * x) % 100 === 0),
    );
    return numQ(
      mk("percent", "비와 비율", lv),
      `${a}의 ${p}%는?`,
      (a * p) / 100,
      "",
      "기준량 × (백분율 ÷ 100)",
      `${a} × ${p}/100 = ${(a * p) / 100}`,
    );
  },
  prism: (rng, lv) => {
    const n = r(rng, 3, by(lv, [6, 8, 10, 12]));
    const t = pick(rng, ["꼭짓점", "모서리", "면"] as const);
    const ans = t === "꼭짓점" ? 2 * n : t === "모서리" ? 3 * n : n + 2;
    return numQ(
      mk("prism", "각기둥과 각뿔", lv),
      `${n}각기둥의 ${t}의 수는 모두 몇 개일까요?`,
      ans,
      "개",
      t === "꼭짓점"
        ? "밑면 2개에 각각 꼭짓점이 n개 있어요."
        : t === "모서리"
          ? "밑면의 변 n개 × 2 + 옆의 모서리 n개"
          : "밑면 2개와 옆면 n개",
      `${t} = ${ans}개`,
    );
  },
  cuboidSurface: (rng, lv) => {
    const [a, b, c] = [
      r(rng, 2, by(lv, [5, 8, 10, 12])),
      r(rng, 2, by(lv, [5, 8, 10, 12])),
      r(rng, 2, by(lv, [5, 8, 10, 12])),
    ];
    return numQ(
      mk("cuboidSurface", "직육면체의 겉넓이", lv),
      `가로 ${a}cm, 세로 ${b}cm, 높이 ${c}cm인 직육면체의 겉넓이는?`,
      2 * (a * b + b * c + c * a),
      "cm²",
      "마주 보는 면 3쌍의 넓이를 모두 더해요.",
      `2 × (${a}×${b} + ${b}×${c} + ${c}×${a}) = ${2 * (a * b + b * c + c * a)}`,
    );
  },
  // #endregion

  // #region 6학년 2학기 — 원의 넓이, 원기둥·원뿔·구, 쌓기나무 (비례식·비례배분은 math-problems.ts)
  circleLength: (rng, lv) => {
    const d = r(rng, 2, by(lv, [9, 15, 25, 40]));
    return numQ(
      mk("circleLength", "원의 둘레와 넓이", lv),
      `원주율을 3으로 할 때, 지름이 ${d}cm인 원의 둘레는?`,
      3 * d,
      "cm",
      "(원주) = (지름) × (원주율)",
      `${d} × 3 = ${3 * d}`,
    );
  },
  circleArea: (rng, lv) => {
    const rad = r(rng, 2, by(lv, [6, 9, 12, 20]));
    return numQ(
      mk("circleArea", "원의 둘레와 넓이", lv),
      `원주율을 3으로 할 때, 반지름이 ${rad}cm인 원의 넓이는?`,
      3 * rad * rad,
      "cm²",
      "(원의 넓이) = (반지름) × (반지름) × (원주율)",
      `${rad} × ${rad} × 3 = ${3 * rad * rad}`,
    );
  },
  circleDiameter: (rng, lv) => {
    const d = r(rng, 2, by(lv, [9, 15, 25, 40]));
    return numQ(
      mk("circleDiameter", "원의 둘레와 넓이", lv),
      `원주율을 3으로 할 때, 둘레가 ${3 * d}cm인 원의 지름은?`,
      d,
      "cm",
      "(지름) = (원주) ÷ (원주율)",
      `${3 * d} ÷ 3 = ${d}`,
    );
  },
  cylinderVolume: (rng, lv) => {
    const rad = r(rng, 2, by(lv, [4, 6, 8, 10]));
    const h = r(rng, 2, by(lv, [6, 9, 12, 15]));
    return numQ(
      mk("cylinderVolume", "원기둥·원뿔·구", lv),
      `원주율을 3으로 할 때, 밑면의 반지름 ${rad}cm, 높이 ${h}cm인 원기둥의 부피는?`,
      3 * rad * rad * h,
      "cm³",
      "(밑면의 넓이) × (높이)",
      `${rad} × ${rad} × 3 × ${h} = ${3 * rad * rad * h}`,
    );
  },
  cylinderNet: (rng, lv) => {
    const rad = r(rng, 2, by(lv, [5, 8, 12, 15]));
    return numQ(
      mk("cylinderNet", "원기둥·원뿔·구", lv),
      `원주율을 3으로 할 때, 밑면의 반지름이 ${rad}cm인 원기둥 전개도에서 옆면의 가로 길이는?`,
      6 * rad,
      "cm",
      "옆면의 가로는 밑면의 둘레와 같아요.",
      `${rad} × 2 × 3 = ${6 * rad}`,
    );
  },
  stackBlocks: (rng, lv) => {
    const [a, b, c] = [
      r(rng, 2, by(lv, [3, 4, 5, 6])),
      r(rng, 2, by(lv, [3, 4, 5, 6])),
      r(rng, 2, by(lv, [3, 4, 5, 6])),
    ];
    return numQ(
      mk("stackBlocks", "쌓기나무", lv),
      `쌓기나무를 가로 ${a}개, 세로 ${b}개, ${c}층으로 빈틈없이 쌓았습니다. 모두 몇 개일까요?`,
      a * b * c,
      "개",
      "(가로 개수) × (세로 개수) × (층수)",
      `${a} × ${b} × ${c} = ${a * b * c}`,
    );
  },
  // #endregion
};

/** 학기(0~11)별 생성기 목록 */
export const MATH_TERMS: string[][] = [
  ["next", "add9", "sub9", "compare9"],
  ["tens", "add20", "sub20", "add2d1d", "clock"],
  ["place3", "add2dCarry", "sub2dBorrow", "times", "make100"],
  ["gugu", "guguInv", "place4", "lengthMCm", "timeMin"],
  ["add3", "sub3", "div1", "mul2x1", "fracOfSet", "unitConvert1"],
  ["mul2x2", "remainder", "circle", "capacity", "fracCompare"],
  ["bigNum", "angleTriangle", "angleLine", "mul3x2", "div3x2", "pattern"],
  ["fracAdd", "fracSub", "mixedToImproper", "decAdd", "isosceles", "angleQuad", "diagonals", "barGraph"],
  [
    "divisorCount",
    "gcdQ",
    "lcmQ",
    "multiplesCount",
    "reduce",
    "commonDenominator",
    "correspondence",
    "areaRect",
    "areaTriangle",
    "areaParallelogram",
    "areaRhombus",
    "areaTrapezoid",
    "perimeter",
  ],
  ["rangeCount", "rounding", "fracTimesNat", "decTimesNat", "mean", "volume"],
  [
    "fracDivNat",
    "natDivFrac",
    "decDivDec",
    "percent",
    "percent",
    "prism",
    "cuboidSurface",
    "ratio:basic",
    "ratio:basic",
  ],
  [
    "circleLength",
    "circleArea",
    "circleDiameter",
    "cylinderVolume",
    "cylinderNet",
    "stackBlocks",
    "ratio:*",
    "ratio:*",
    "ratio:*",
    "ratio:*",
  ],
];
