/**
 * 수학 관문 문구 (한국어 / 영어).
 * 원본 로케일 저장소(서브모듈)는 건드리지 않고, 이 모듈 안에 문구를 둔다.
 * 한국어가 아니면 영어로 표시한다.
 */
import type { MathItemKey, MathProblem } from "#app/math/math-problems";

export type MathLang = "ko" | "en";

export interface ProblemText {
  /** 문제 본문 (줄바꿈 포함) */
  question: string;
  /** 답 단위 (예: "개") */
  unit: string;
  hint: string;
  /** 풀이 (줄바꿈 포함) */
  explanation: string;
}

/** 한글 받침이 있는지 */
function hasBatchim(word: string): boolean {
  const ch = word.charCodeAt(word.length - 1);
  if (ch >= 0xac00 && ch <= 0xd7a3) {
    return (ch - 0xac00) % 28 !== 0;
  }
  // 숫자로 끝나면 읽는 소리 기준 (0,1,3,6,7,8 → 받침 있음)
  const last = word.at(-1) ?? "";
  if (last === "g") {
    return true; // 그램
  }
  if (/\d/.test(last)) {
    return "013678".includes(last);
  }
  return false;
}

/** "(으)로": 받침이 없거나 ㄹ 받침이면 "로" */
export function josaRo(word: string): string {
  const last = word.at(-1) ?? "";
  if (/\d/.test(last)) {
    return word + ("036".includes(last) ? "으로" : "로");
  }
  const ch = word.charCodeAt(word.length - 1);
  const jong = ch >= 0xac00 && ch <= 0xd7a3 ? (ch - 0xac00) % 28 : 0;
  return word + (jong === 0 || jong === 8 ? "로" : "으로");
}

/** 조사 붙이기: josa("피카츄", "이", "가") → "피카츄가" */
export function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  return word + (hasBatchim(word) ? withBatchim : withoutBatchim);
}

const ITEMS: Record<MathLang, Record<MathItemKey, { name: string; unit: string }>> = {
  ko: {
    pokeball: { name: "몬스터볼", unit: "개" },
    potion: { name: "상처약", unit: "개" },
    berry: { name: "나무열매", unit: "개" },
    rareCandy: { name: "이상한사탕", unit: "개" },
    pokeFood: { name: "포켓몬 사료", unit: "g" },
    stardust: { name: "별의모래", unit: "개" },
  },
  en: {
    pokeball: { name: "Poké Balls", unit: "" },
    potion: { name: "Potions", unit: "" },
    berry: { name: "Berries", unit: "" },
    rareCandy: { name: "Rare Candies", unit: "" },
    pokeFood: { name: "grams of Pokémon food", unit: "g" },
    stardust: { name: "Stardust", unit: "" },
  },
};

export const FALLBACK_NAMES: Record<MathLang, string[]> = {
  ko: ["피카츄", "이브이", "리자몽", "꼬부기", "이상해씨", "루카리오", "잠만보", "팬텀"],
  en: ["Pikachu", "Eevee", "Charizard", "Squirtle", "Bulbasaur", "Lucario", "Snorlax", "Gengar"],
};

const UI: Record<MathLang, Record<string, string>> = {
  ko: {
    title: "{floor}층으로 가는 문",
    subtitle: "비례 문제를 풀면 다음 층이 열려요!",
    level: "난이도",
    hint: "힌트",
    confirm: "확인",
    needInput: "답을 먼저 입력하세요!",
    wrong: "앗, 틀렸어요! ({n}/{max}) 힌트를 써 보세요.",
    newProblem: "풀이를 확인하고 새 문제에 도전하세요!",
    correct: "정답! {floor}층이 열렸어요!",
    bonus: "한 번에 성공! 보너스 ₽{bonus}",
    streak: "연속 정답 {n}",
    keys: "숫자키 입력 · Enter 확인 · H 힌트",
  },
  en: {
    title: "Gate to Floor {floor}",
    subtitle: "Solve the ratio problem to open the next floor!",
    level: "Level",
    hint: "Hint",
    confirm: "OK",
    needInput: "Enter an answer first!",
    wrong: "Not quite! ({n}/{max}) Try the hint.",
    newProblem: "Check the solution and try a new problem!",
    correct: "Correct! Floor {floor} is open!",
    bonus: "First try! Bonus ₽{bonus}",
    streak: "Streak {n}",
    keys: "Number keys · Enter to submit · H for hint",
  },
};

/** UI 문구 */
export function ui(lang: MathLang, key: string, vars: Record<string, string | number> = {}): string {
  return (UI[lang][key] ?? UI.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export function toMathLang(language: string | undefined): MathLang {
  return language?.toLowerCase().startsWith("ko") ? "ko" : "en";
}

/** 비례식 기호를 붙여 "3 : 4 : 5" 형식으로 */
const r = (nums: (number | string)[]) => nums.join(" : ");

/**
 * 문제 데이터를 문장으로 만든다.
 * @param names - 문제에 등장시킬 포켓몬 이름 (서로 다른 이름 3개 이상 권장)
 */
export function formatProblem(p: MathProblem, lang: MathLang, names: string[]): ProblemText {
  const pool = [...new Set([...names, ...FALLBACK_NAMES[lang]])];
  const n = (i: number) => pool[i % pool.length];
  return lang === "ko" ? formatKo(p, n) : formatEn(p, n);
}

function formatKo(p: MathProblem, n: (i: number) => string): ProblemText {
  switch (p.kind) {
    case "proportion": {
      const shown = p.terms.map((t, i) => (i === p.blank ? "□" : t));
      const [a, b, c, d] = p.terms;
      const outer = p.blank === 0 || p.blank === 3;
      const known = outer ? [b, c] : [a, d];
      const other = outer ? p.terms[3 - p.blank] : p.terms[p.blank === 1 ? 2 : 1];
      return {
        question: `□ 안에 알맞은 수는?\n\n${r(shown.slice(0, 2))} = ${r(shown.slice(2))}`,
        unit: "",
        hint: `외항의 곱 = 내항의 곱\n□가 ${outer ? "외항" : "내항"}이니까 □ × ${other} = ${known[0]} × ${known[1]}`,
        explanation: `외항의 곱 = 내항의 곱\n${a} × ${d} = ${b} × ${c} = ${a * d}\n□ = ${a * d} ÷ ${other} = ${p.answer}`,
      };
    }
    case "share2":
    case "share3": {
      const item = ITEMS.ko[p.item];
      const who = p.ratio.map((_, i) => n(i));
      const sum = p.ratio.reduce((x, y) => x + y, 0);
      const list =
        who.length === 2 ? `${josa(who[0], "과", "와")} ${who[1]}` : `${who[0]}, ${josa(who[1], "과", "와")} ${who[2]}`;
      return {
        question: `${item.name} ${p.total}${item.unit}${hasBatchim(`${p.total}${item.unit}`) ? "을" : "를"}\n${list}에게\n${josaRo(r(p.ratio))} 나누어 줍니다.\n\n${josa(who[p.ask], "이", "가")} 받는 양은?`,
        unit: item.unit,
        hint: `비의 합 = ${p.ratio.join(" + ")} = ${sum}\n${josa(who[p.ask], "은", "는")} 전체의 ${sum}분의 ${p.ratio[p.ask]}만큼 받아요.`,
        explanation: `비의 합 = ${sum}\n${p.total} × ${p.ratio[p.ask]}/${sum} = ${p.total} ÷ ${sum} × ${p.ratio[p.ask]}\n= ${p.total / sum} × ${p.ratio[p.ask]} = ${p.answer}`,
      };
    }
    case "difference": {
      const [big, small] = p.ratio;
      const a = n(0);
      const b = n(1);
      const unit = p.diff / (big - small);
      return {
        question: `${josa(a, "과", "와")} ${b}의 레벨 비는 ${r(p.ratio)}이고,\n레벨 차이는 ${p.diff}입니다.\n\n${p.ask === 0 ? a : b}의 레벨은?`,
        unit: "",
        hint: `비의 차 ${big} - ${small} = ${big - small}칸이 실제로 ${p.diff}만큼이에요.\n한 칸의 크기를 먼저 구해 보세요.`,
        explanation: `비의 차 = ${big} - ${small} = ${big - small}\n한 칸 = ${p.diff} ÷ ${big - small} = ${unit}\n${p.ratio[p.ask]} × ${unit} = ${p.answer}`,
      };
    }
  }
}

function formatEn(p: MathProblem, n: (i: number) => string): ProblemText {
  switch (p.kind) {
    case "proportion": {
      const shown = p.terms.map((t, i) => (i === p.blank ? "□" : t));
      const [a, b, c, d] = p.terms;
      const outer = p.blank === 0 || p.blank === 3;
      const known = outer ? [b, c] : [a, d];
      const other = outer ? p.terms[3 - p.blank] : p.terms[p.blank === 1 ? 2 : 1];
      return {
        question: `Fill in the box.\n\n${r(shown.slice(0, 2))} = ${r(shown.slice(2))}`,
        unit: "",
        hint: `Product of extremes = product of means\n□ × ${other} = ${known[0]} × ${known[1]}`,
        explanation: `${a} × ${d} = ${b} × ${c} = ${a * d}\n□ = ${a * d} ÷ ${other} = ${p.answer}`,
      };
    }
    case "share2":
    case "share3": {
      const item = ITEMS.en[p.item];
      const who = p.ratio.map((_, i) => n(i));
      const sum = p.ratio.reduce((x, y) => x + y, 0);
      const list = who.length === 2 ? `${who[0]} and ${who[1]}` : `${who[0]}, ${who[1]} and ${who[2]}`;
      return {
        question: `${p.total} ${item.name} are shared by\n${list}\nin the ratio ${r(p.ratio)}.\n\nHow much does ${who[p.ask]} get?`,
        unit: item.unit,
        hint: `Total parts = ${p.ratio.join(" + ")} = ${sum}\n${who[p.ask]} gets ${p.ratio[p.ask]}/${sum} of the total.`,
        explanation: `Total parts = ${sum}\n${p.total} ÷ ${sum} × ${p.ratio[p.ask]}\n= ${p.total / sum} × ${p.ratio[p.ask]} = ${p.answer}`,
      };
    }
    case "difference": {
      const [big, small] = p.ratio;
      const unit = p.diff / (big - small);
      return {
        question: `The levels of ${n(0)} and ${n(1)} are in the ratio ${r(p.ratio)}.\nTheir difference is ${p.diff}.\n\nWhat is ${p.ask === 0 ? n(0) : n(1)}'s level?`,
        unit: "",
        hint: `The ratio gap ${big} - ${small} = ${big - small} parts equals ${p.diff}.\nFind the size of one part first.`,
        explanation: `Gap = ${big - small} parts\nOne part = ${p.diff} ÷ ${big - small} = ${unit}\n${p.ratio[p.ask]} × ${unit} = ${p.answer}`,
      };
    }
  }
}
