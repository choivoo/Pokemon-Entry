/**
 * 수학 포켓로그: 비례식 / 비례배분 문제 생성기.
 * 순수 함수 모듈이라 게임 엔진 없이도 테스트할 수 있다.
 */

export type MathProblemKind = "proportion" | "share2" | "share3" | "difference";

export interface MathProblem {
  kind: MathProblemKind;
  /** 문제 본문 (줄바꿈 포함 가능) */
  question: string;
  /** 정답 (항상 양의 정수) */
  answer: number;
  /** 답 뒤에 붙는 단위 (없으면 빈 문자열) */
  unit: string;
  /** 힌트 */
  hint: string;
  /** 풀이 설명 */
  explanation: string;
}

export type Rng = () => number;

const ITEMS: readonly { name: string; unit: string }[] = [
  { name: "몬스터볼", unit: "개" },
  { name: "상처약", unit: "개" },
  { name: "나무열매", unit: "개" },
  { name: "이상한사탕", unit: "개" },
  { name: "포켓몬 사료", unit: "g" },
  { name: "모의 배틀 점수", unit: "점" },
];

const NAMES: readonly string[] = ["피카츄", "이브이", "리자몽", "거북왕", "이상해꽃", "루카리오", "갸라도스", "잠만보"];

function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[randInt(rng, 0, arr.length - 1)];
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** 서로소인 (a, b) 비를 뽑는다. a !== b */
function coprimePair(rng: Rng, max: number): [number, number] {
  for (let i = 0; i < 100; i++) {
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

/** a : b = c : x 형태 (미지수 위치 무작위) */
function makeProportion(rng: Rng, level: number): MathProblem {
  const maxTerm = level === 1 ? 5 : level === 2 ? 9 : 13;
  const maxMul = level === 1 ? 5 : level === 2 ? 9 : 15;
  const [a, b] = coprimePair(rng, maxTerm);
  const k = randInt(rng, 2, maxMul);
  const c = a * k;
  const d = b * k;
  const pos = randInt(rng, 0, 3);
  const terms = [a, b, c, d];
  const answer = terms[pos];
  const shown = terms.map((t, i) => (i === pos ? "□" : String(t)));
  const question = `비례식을 완성하세요.\n${shown[0]} : ${shown[1]} = ${shown[2]} : ${shown[3]}`;
  // 외항의 곱 = 내항의 곱
  const outer = pos === 0 || pos === 3 ? "외항의 곱" : "내항의 곱";
  const known = terms.filter((_, i) => i !== pos);
  const explanation = `비례식에서 외항의 곱 = 내항의 곱 이에요.\n${a} × ${d} = ${b} × ${c}  (= ${a * d})\n그래서 □ = ${answer}`;
  return {
    kind: "proportion",
    question,
    answer,
    unit: "",
    hint: `${outer}과 같은 값을 가진 다른 쪽(내항·외항)의 곱을 이용하세요. 이미 아는 세 수: ${known.join(", ")}`,
    explanation,
  };
}

/** 전체를 a : b 로 배분 */
function makeShare2(rng: Rng, level: number): MathProblem {
  const maxTerm = level === 1 ? 5 : level === 2 ? 8 : 11;
  const [a, b] = coprimePair(rng, maxTerm);
  const unitSize = randInt(rng, 2, level === 1 ? 6 : level === 2 ? 12 : 25);
  const total = (a + b) * unitSize;
  const item = pick(rng, ITEMS);
  const [n1, n2] = twoNames(rng);
  const askFirst = rng() < 0.5;
  const answer = (askFirst ? a : b) * unitSize;
  const asked = askFirst ? n1 : n2;
  const question = `${item.name} ${total}${item.unit}을(를) ${n1}와(과) ${n2}가\n${a} : ${b} 로 나누어 가집니다.\n${asked}가 갖는 양은 얼마일까요?`;
  const explanation = `전체 비의 합 = ${a} + ${b} = ${a + b}\n${asked}의 몫 = ${total} × ${askFirst ? a : b}/${a + b} = ${answer}`;
  return {
    kind: "share2",
    question,
    answer,
    unit: item.unit,
    hint: `전체를 비의 합(${a} + ${b} = ${a + b})으로 나눈 뒤, ${asked}의 비(${askFirst ? a : b})를 곱하세요.`,
    explanation,
  };
}

/** 전체를 a : b : c 로 배분 */
function makeShare3(rng: Rng, level: number): MathProblem {
  const maxTerm = level <= 3 ? 6 : 9;
  let a = 1;
  let b = 2;
  let c = 3;
  for (let i = 0; i < 100; i++) {
    a = randInt(rng, 1, maxTerm);
    b = randInt(rng, 1, maxTerm);
    c = randInt(rng, 1, maxTerm);
    if (new Set([a, b, c]).size === 3 && gcd(gcd(a, b), c) === 1) {
      break;
    }
  }
  const unitSize = randInt(rng, 2, level <= 3 ? 12 : 25);
  const total = (a + b + c) * unitSize;
  const item = pick(rng, ITEMS);
  const names = threeNames(rng);
  const ratios = [a, b, c];
  const idx = randInt(rng, 0, 2);
  const answer = ratios[idx] * unitSize;
  const question = `${item.name} ${total}${item.unit}을(를)\n${names[0]}, ${names[1]}, ${names[2]}에게 ${a} : ${b} : ${c} 로 나눕니다.\n${names[idx]}가 받는 양은 얼마일까요?`;
  return {
    kind: "share3",
    question,
    answer,
    unit: item.unit,
    hint: `비의 합은 ${a} + ${b} + ${c} = ${a + b + c} 이에요. 전체를 ${a + b + c}로 나눠 보세요.`,
    explanation: `비의 합 = ${a + b + c}\n${names[idx]}의 몫 = ${total} × ${ratios[idx]}/${a + b + c} = ${answer}`,
  };
}

/** 두 양의 비와 차이가 주어졌을 때 */
function makeDifference(rng: Rng, level: number): MathProblem {
  const [x, y] = coprimePair(rng, level === 3 ? 9 : 12);
  const hi = Math.max(x, y);
  const lo = Math.min(x, y);
  const unitSize = randInt(rng, 2, level === 3 ? 10 : 20);
  const diff = (hi - lo) * unitSize;
  const [n1, n2] = twoNames(rng);
  const askBigger = rng() < 0.5;
  const answer = (askBigger ? hi : lo) * unitSize;
  const question = `${n1}와(과) ${n2}의 레벨 비는 ${hi} : ${lo} 이고,\n두 레벨의 차이는 ${diff}입니다.\n${askBigger ? n1 : n2}의 레벨은 얼마일까요?\n(${askBigger ? n1 : n2}는 ${askBigger ? "더 높은" : "더 낮은"} 쪽입니다)`;
  return {
    kind: "difference",
    question,
    answer,
    unit: "",
    hint: `비의 차는 ${hi} - ${lo} = ${hi - lo}. 이것이 실제 차이 ${diff}에 해당해요. 비 1칸의 크기를 구해 보세요.`,
    explanation: `비의 차 = ${hi} - ${lo} = ${hi - lo} → 실제 ${diff}\n비 1칸 = ${diff} ÷ ${hi - lo} = ${unitSize}\n정답 = ${askBigger ? hi : lo} × ${unitSize} = ${answer}`,
  };
}

function twoNames(rng: Rng): [string, string] {
  const first = pick(rng, NAMES);
  let second = pick(rng, NAMES);
  while (second === first) {
    second = pick(rng, NAMES);
  }
  return [first, second];
}

function threeNames(rng: Rng): [string, string, string] {
  const [a, b] = twoNames(rng);
  let c = pick(rng, NAMES);
  while (c === a || c === b) {
    c = pick(rng, NAMES);
  }
  return [a, b, c];
}

/**
 * 웨이브에 맞는 문제를 하나 만든다.
 * @param wave - 방금 클리어한 웨이브(층) 번호
 * @param rng - 난수 함수 (기본 Math.random)
 * @param exclude - 직전 문제 종류와 같은 종류를 피하고 싶을 때
 */
export function generateProblem(wave: number, rng: Rng = Math.random, exclude?: MathProblemKind): MathProblem {
  const level = getDifficulty(wave);
  const pool: MathProblemKind[] =
    level === 1 ? ["proportion", "proportion", "share2"]
    : level === 2 ? ["proportion", "share2", "share2"]
    : level === 3 ? ["proportion", "share2", "share3", "difference"]
    : ["share2", "share3", "difference", "difference"];
  const filtered = pool.filter(k => k !== exclude);
  const kind = pick(rng, filtered.length > 0 ? filtered : pool);
  switch (kind) {
    case "proportion":
      return makeProportion(rng, level);
    case "share2":
      return makeShare2(rng, level);
    case "share3":
      return makeShare3(rng, level);
    case "difference":
      return makeDifference(rng, level);
  }
}
