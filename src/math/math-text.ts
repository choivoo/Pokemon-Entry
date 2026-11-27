/**
 * 수학 관문 문구 (한국어 / 영어).
 * 원본 로케일 저장소(서브모듈)는 건드리지 않고, 이 모듈 안에 문구를 둔다.
 * 한국어가 아니면 영어로 표시한다.
 */
import type { DirectContext, MathItemKey, MathProblem, MathProblemKind, Term } from "#app/math/math-problems";

export type MathLang = "ko" | "en";

export interface ProblemText {
  /** 단원 이름 (예: "비례배분") */
  category: string;
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
    bonus: "한 번에 성공! 보상 기회 +1",
    streak: "연속 정답 {n}",
    keys: "숫자키 입력 · Enter 확인 · H 힌트",
    rewardsEarned: "보상 기회 {n}번을 얻었어요!",
    rouletteTitle: "보상 룰렛",
    rouletteSub: "돌려서 나온 보상을 받아요!",
    jackpotTitle: "잭팟 룰렛",
    jackpotSub: "연속 정답 보너스! 좋은 보상만 들어 있어요!",
    boxTitle: "보물 상자",
    boxSub: "상자 하나를 골라 열어 보세요!",
    choiceTitle: "보상 고르기",
    choiceSub: "원하는 보상 하나를 고르세요!",
    spin: "돌리기",
    take: "받기",
    open: "열기",
    pick: "고르기",
    rewardKeys: "← → 선택 · Enter 확인",
    rarity0: "일반",
    rarity1: "고급",
    rarity2: "울트라",
    rarity3: "로그",
    rarity4: "마스터",
    rewardBalls: "{ball} {n}개",
    rewardMoney: "₽{amount}",
    rewardMoneyDesc: "돈을 받아요.",
    rewardBallsDesc: "몬스터볼 가방에 바로 들어가요.",
    rewardShop: "아이템 선택 찬스 ({n}개 중 1개)",
    rewardShopDesc: "원본 아이템 고르기 화면이 한 번 더 열려요. 등급: {tiers}",
    rewardRoulette: "룰렛권 ×{n}",
    rewardRouletteDesc: "보상 룰렛을 {n}번 더 돌려요!",
    rewardJackpot: "잭팟 룰렛권",
    rewardJackpotDesc: "울트라 등급 이상만 나오는 룰렛을 돌려요!",
    gotMoney: "₽{amount} 획득!",
    gotBalls: "{ball} {n}개를 받았다!",
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
    bonus: "First try! +1 reward chance",
    streak: "Streak {n}",
    keys: "Number keys · Enter to submit · H for hint",
    rewardsEarned: "You earned {n} reward chance(s)!",
    rouletteTitle: "Reward Roulette",
    rouletteSub: "Spin and win a reward!",
    jackpotTitle: "Jackpot Roulette",
    jackpotSub: "Streak bonus! Only great rewards!",
    boxTitle: "Treasure Chests",
    boxSub: "Pick a chest to open!",
    choiceTitle: "Pick a Reward",
    choiceSub: "Choose one reward!",
    spin: "Spin",
    take: "Take",
    open: "Open",
    pick: "Pick",
    rewardKeys: "← → to choose · Enter to confirm",
    rarity0: "Common",
    rarity1: "Great",
    rarity2: "Ultra",
    rarity3: "Rogue",
    rarity4: "Master",
    rewardBalls: "{n}× {ball}",
    rewardMoney: "₽{amount}",
    rewardMoneyDesc: "Receive money.",
    rewardBallsDesc: "Goes straight into your ball bag.",
    rewardShop: "Item pick ({n} choices)",
    rewardShopDesc: "Opens the item selection screen again. Tiers: {tiers}",
    rewardRoulette: "Roulette ticket ×{n}",
    rewardRouletteDesc: "Spin the reward roulette {n} more time(s)!",
    rewardJackpot: "Jackpot ticket",
    rewardJackpotDesc: "Spin a roulette with Ultra rewards or better!",
    gotMoney: "You received ₽{amount}!",
    gotBalls: "You received {n} {ball}!",
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

/** 빈칸(□)을 넣은 비례식 */
function eq(terms: Term[], blank?: number): string {
  const t = terms.map((x, i) => (i === blank ? "□" : String(x)));
  return `${r(t.slice(0, 2))} = ${r(t.slice(2))}`;
}

const CATEGORY: Record<MathLang, Record<MathProblemKind, string>> = {
  ko: {
    proportion: "비례식",
    proportionDecimal: "비례식 (소수)",
    proportionFraction: "비례식 (분수)",
    meansProduct: "비례식의 성질",
    isProportion: "비례식 찾기",
    ratioProperty: "비의 성질",
    simplify: "간단한 자연수의 비",
    simplifyDecimal: "간단한 자연수의 비 (소수)",
    simplifyFraction: "간단한 자연수의 비 (분수)",
    directProportion: "비례식의 활용",
    mapScale: "축척",
    mapScaleReverse: "축척",
    gears: "톱니바퀴",
    rectangle: "도형과 비",
    share2: "비례배분",
    share3: "비례배분 (3명)",
    shareOther: "비례배분",
    shareTotal: "비례배분 (전체 구하기)",
    difference: "비와 차",
    connected: "연비",
  },
  en: {
    proportion: "Proportion",
    proportionDecimal: "Proportion (decimals)",
    proportionFraction: "Proportion (fractions)",
    meansProduct: "Means & extremes",
    isProportion: "Find the proportion",
    ratioProperty: "Ratio property",
    simplify: "Simplest ratio",
    simplifyDecimal: "Simplest ratio (decimals)",
    simplifyFraction: "Simplest ratio (fractions)",
    directProportion: "Using proportions",
    mapScale: "Map scale",
    mapScaleReverse: "Map scale",
    gears: "Gears",
    rectangle: "Shapes & ratio",
    share2: "Proportional sharing",
    share3: "Sharing (3 people)",
    shareOther: "Proportional sharing",
    shareTotal: "Sharing (find total)",
    difference: "Ratio & difference",
    connected: "Combined ratio",
  },
};

const DIRECT: Record<MathLang, Record<DirectContext, (a: number, A: number, b: number) => [string, string]>> = {
  ko: {
    price: (a, A, b) => [`몬스터볼 ${a}개의 값이 ${A}원입니다.\n몬스터볼 ${b}개의 값은 몇 원일까요?`, "원"],
    recipe: (a, A, b) => [`포켓몬 ${a}마리에게 사료 ${A}g이 필요합니다.\n${b}마리에게는 몇 g이 필요할까요?`, "g"],
    walk: (a, A, b) => [`피카츄가 ${a}분 동안 ${A}m를 걷습니다.\n같은 빠르기로 ${b}분 동안은 몇 m를 걸을까요?`, "m"],
    exp: (a, A, b) => [
      `배틀 ${a}번에 경험치 ${josa(String(A), "을", "를")} 얻습니다.\n배틀 ${b}번이면 경험치를 얼마나 얻을까요?`,
      "",
    ],
  },
  en: {
    price: (a, A, b) => [`${a} Poké Balls cost ₽${A}.\nHow much do ${b} Poké Balls cost?`, ""],
    recipe: (a, A, b) => [`${a} Pokémon need ${A}g of food.\nHow many grams do ${b} Pokémon need?`, "g"],
    walk: (a, A, b) => [`Pikachu walks ${A}m in ${a} minutes.\nAt the same speed, how far in ${b} minutes?`, "m"],
    exp: (a, A, b) => [`${a} battles give ${A} EXP.\nHow much EXP do ${b} battles give?`, ""],
  },
};

/**
 * 문제 데이터를 문장으로 만든다.
 * @param names - 문제에 등장시킬 포켓몬 이름 (서로 다른 이름 3개 이상 권장)
 */
export function formatProblem(p: MathProblem, lang: MathLang, names: string[]): ProblemText {
  const pool = [...new Set([...names, ...FALLBACK_NAMES[lang]])];
  const n = (i: number) => pool[i % pool.length];
  const text = lang === "ko" ? formatKo(p, n) : formatEn(p, n);
  return { category: CATEGORY[lang][p.kind], ...text };
}

type Body = Omit<ProblemText, "category">;

/** 비례식 빈칸 공통 힌트/풀이 */
function proportionParts(p: MathProblem, lang: MathLang): { hint: string; explanation: string } {
  const terms = p.v.terms!;
  const blank = p.v.blank!;
  const outer = blank === 0 || blank === 3;
  const partner = outer ? 3 - blank : blank === 1 ? 2 : 1;
  const others = outer ? [terms[1], terms[2]] : [terms[0], terms[3]];
  const filled = terms.map((t, i) => (i === blank ? p.answer : t));
  const [a, b, c, d] = filled;
  if (lang === "ko") {
    return {
      hint: `외항의 곱 = 내항의 곱\n□가 ${outer ? "외항" : "내항"}이니까 □ × ${terms[partner]} = ${others[0]} × ${others[1]}`,
      explanation: `외항의 곱 = 내항의 곱\n${a} × ${d} = ${b} × ${c}\n□ = ${p.answer}`,
    };
  }
  return {
    hint: `Product of extremes = product of means\n□ × ${terms[partner]} = ${others[0]} × ${others[1]}`,
    explanation: `${a} × ${d} = ${b} × ${c}\n□ = ${p.answer}`,
  };
}

function formatKo(p: MathProblem, n: (i: number) => string): Body {
  const v = p.v;
  switch (p.kind) {
    case "proportion":
    case "proportionDecimal":
    case "proportionFraction": {
      const parts = proportionParts(p, "ko");
      const extra =
        p.kind === "proportionDecimal"
          ? "\n(소수는 10배 해서 자연수로 바꿔 보세요)"
          : p.kind === "proportionFraction"
            ? "\n(1/a : 1/b 는 b : a 와 같아요)"
            : "";
      return {
        question: `□ 안에 알맞은 수는?\n\n${eq(v.terms!, v.blank)}`,
        unit: "",
        hint: parts.hint + extra,
        explanation: parts.explanation,
      };
    }
    case "meansProduct": {
      const filled = v.terms!.map((t, i) => (i === v.blank ? "□" : t));
      const which = v.ask === 0 ? "외항의 곱" : "내항의 곱";
      const known = v.ask === 0 ? `${v.terms![1]} × ${v.terms![2]}` : `${v.terms![0]} × ${v.terms![3]}`;
      return {
        question: `비례식 ${r(filled.slice(0, 2))} = ${r(filled.slice(2))}에서\n${which}은 얼마일까요?`,
        unit: "",
        hint: `비례식에서 외항의 곱과 내항의 곱은 같아요.\n□를 몰라도 다른 쪽 곱 ${known}을 계산해 보세요.`,
        explanation: `외항의 곱 = 내항의 곱\n${known} = ${p.answer}`,
      };
    }
    case "isProportion": {
      const lines = v.choices!.map((c, i) => `${i + 1}) ${r(c.slice(0, 2))} = ${r(c.slice(2))}`).join("\n");
      const right = v.choices![p.answer - 1];
      return {
        question: `비례식인 것은 몇 번일까요?\n${lines}`,
        unit: "번",
        hint: "외항의 곱과 내항의 곱이 같은 것을 찾아보세요.",
        explanation: `${p.answer}번: ${right[0]} × ${right[3]} = ${right[1]} × ${right[2]} = ${right[0] * right[3]}`,
      };
    }
    case "ratioProperty": {
      const [a, b] = v.ratio!;
      const k = v.k!;
      if (v.op === "mul") {
        const shown = v.ask === 0 ? `□ : ${b * k}` : `${a * k} : □`;
        return {
          question: `${r([a, b])}의 전항과 후항에 각각 ${josa(String(k), "을", "를")} 곱하면\n${shown}입니다. □는?`,
          unit: "",
          hint: "비의 전항과 후항에 0이 아닌 같은 수를 곱해도 비율은 같아요.",
          explanation: `${a} × ${k} = ${a * k},  ${b} × ${k} = ${b * k}\n□ = ${p.answer}`,
        };
      }
      const shown = v.ask === 0 ? `□ : ${b}` : `${a} : □`;
      return {
        question: `${r([a * k, b * k])}의 전항과 후항을 각각 ${k}로 나누면\n${shown}입니다. □는?`.replace(
          `${k}로`,
          josaRo(String(k)),
        ),
        unit: "",
        hint: "비의 전항과 후항을 0이 아닌 같은 수로 나누어도 비율은 같아요.",
        explanation: `${a * k} ÷ ${k} = ${a},  ${b * k} ÷ ${k} = ${b}\n□ = ${p.answer}`,
      };
    }
    case "simplify":
    case "simplifyDecimal":
    case "simplifyFraction": {
      const [x, y] = v.ratio!;
      const [a, b] = v.result!;
      const shownRatio =
        p.kind === "simplify"
          ? r([x, y])
          : p.kind === "simplifyDecimal"
            ? r([decimalStr(x), decimalStr(y)])
            : r([`1/${x}`, `1/${y}`]);
      const target = v.ask === 0 ? `□ : ${b}` : `${a} : □`;
      const hint =
        p.kind === "simplify"
          ? `두 수의 최대공약수 ${josaRo(String(gcdOf(x, y)))} 전항과 후항을 나누어 보세요.`
          : p.kind === "simplifyDecimal"
            ? "먼저 전항과 후항에 10을 곱해 자연수의 비로 만드세요."
            : `분모의 최소공배수 ${josa(String(x * y), "을", "를")} 곱해 보세요.`;
      const explanation =
        p.kind === "simplify"
          ? `${x} ÷ ${gcdOf(x, y)} = ${a},  ${y} ÷ ${gcdOf(x, y)} = ${b}`
          : p.kind === "simplifyDecimal"
            ? `× 10 → ${r([x, y])}\n÷ ${gcdOf(x, y)} → ${r([a, b])}`
            : `× ${x * y} → ${r([y, x])}`;
      return {
        question: `${p.kind === "simplifyFraction" ? `${shownRatio}을` : josa(shownRatio, "을", "를")} 가장 간단한\n자연수의 비로 나타내면 ${target}\n□는?`,
        unit: "",
        hint,
        explanation: `${explanation}\n□ = ${p.answer}`,
      };
    }
    case "directProportion": {
      const [question, unit] = DIRECT.ko[v.context!](v.a!, v.A!, v.b!);
      return {
        question,
        unit,
        hint: `${v.a} : ${v.A} = ${v.b} : □ 로 비례식을 세워 보세요.`,
        explanation: `${v.a} : ${v.A} = ${v.b} : □\n${v.a} × □ = ${v.A} × ${v.b}\n□ = ${p.answer}`,
      };
    }
    case "mapScale":
      return {
        question: `축척이 1 : ${v.scale}인 지도에서\n길이가 ${v.mapCm}cm인 길은\n실제로 몇 m일까요?`,
        unit: "m",
        hint: `1 : ${v.scale} = ${v.mapCm} : □ (cm)\n구한 cm를 100으로 나누면 m예요.`,
        explanation: `${v.mapCm} × ${v.scale} = ${v.mapCm! * v.scale!}cm\n= ${p.answer}m`,
      };
    case "mapScaleReverse":
      return {
        question: `축척이 1 : ${v.scale}인 지도에서\n실제 거리 ${v.realM}m는\n지도에서 몇 cm일까요?`,
        unit: "cm",
        hint: `먼저 ${v.realM}m를 cm로 바꾸면 ${v.realM! * 100}cm예요.\n1 : ${v.scale} = □ : ${v.realM! * 100}`,
        explanation: `${v.realM! * 100} ÷ ${v.scale} = ${p.answer}cm`,
      };
    case "gears": {
      const [small, big] = v.teeth!;
      const askSmall = v.ask === 0;
      return {
        question: `톱니 수가 ${small}개인 톱니바퀴 ㉮와\n${big}개인 톱니바퀴 ㉯가 맞물려 돕니다.\n${askSmall ? "㉯" : "㉮"}가 ${v.turns}바퀴 돌 때\n${askSmall ? "㉮" : "㉯"}는 몇 바퀴 돌까요?`,
        unit: "바퀴",
        hint: "맞물린 톱니바퀴는 (톱니 수 × 회전 수)가 같아요.",
        explanation: `${askSmall ? big : small} × ${v.turns} = ${askSmall ? small : big} × □\n□ = ${p.answer}`,
      };
    }
    case "rectangle": {
      const [a, b] = v.ratio!;
      return {
        question: `가로와 세로의 비가 ${r([a, b])}인 직사각형의\n둘레가 ${v.total}cm입니다.\n${v.ask === 0 ? "가로" : "세로"}는 몇 cm일까요?`,
        unit: "cm",
        hint: `가로 + 세로 = 둘레 ÷ 2 = ${v.total! / 2}cm\n이것을 ${r([a, b])}로 비례배분하세요.`.replace(
          `${r([a, b])}로`,
          josaRo(r([a, b])),
        ),
        explanation: `가로 + 세로 = ${v.total! / 2}\n${v.total! / 2} × ${[a, b][v.ask!]}/${a + b} = ${p.answer}`,
      };
    }
    case "share2":
    case "share3": {
      const item = ITEMS.ko[v.item!];
      const who = v.ratio!.map((_, i) => n(i));
      const sum = v.ratio!.reduce((x, y) => x + y, 0);
      const list =
        who.length === 2 ? `${josa(who[0], "과", "와")} ${who[1]}` : `${who[0]}, ${josa(who[1], "과", "와")} ${who[2]}`;
      return {
        question: `${item.name} ${p.v.total}${item.unit}${hasBatchim(`${v.total}${item.unit}`) ? "을" : "를"}\n${list}에게\n${josaRo(r(v.ratio!))} 나누어 줍니다.\n\n${josa(who[v.ask!], "이", "가")} 받는 양은?`,
        unit: item.unit,
        hint: `비의 합 = ${v.ratio!.join(" + ")} = ${sum}\n${josa(who[v.ask!], "은", "는")} 전체의 ${sum}분의 ${v.ratio![v.ask!]}만큼 받아요.`,
        explanation: `비의 합 = ${sum}\n${v.total} × ${v.ratio![v.ask!]}/${sum} = ${v.total} ÷ ${sum} × ${v.ratio![v.ask!]}\n= ${v.total! / sum} × ${v.ratio![v.ask!]} = ${p.answer}`,
      };
    }
    case "shareOther":
    case "shareTotal": {
      const item = ITEMS.ko[v.item!];
      const who = [n(0), n(1)];
      const [a, b] = v.ratio!;
      const knownRatio = v.ratio![v.knownIdx!];
      const unitSize = v.known! / knownRatio;
      const ask =
        p.kind === "shareTotal"
          ? `처음 ${josa(item.name, "은", "는")} 모두 몇 ${item.unit || "개"}였을까요?`
          : `${josa(who[v.ask!], "이", "가")} 받은 양은?`;
      return {
        question: `${josa(item.name, "을", "를")} ${josa(who[0], "과", "와")} ${who[1]}에게\n${josaRo(r([a, b]))} 나누어 주었더니\n${josa(who[v.knownIdx!], "이", "가")} ${v.known}${item.unit} 받았습니다.\n${ask}`,
        unit: item.unit,
        hint: `비 1칸 = ${v.known} ÷ ${knownRatio}\n(${who[v.knownIdx!]}의 비는 ${knownRatio}칸)`,
        explanation: `비 1칸 = ${v.known} ÷ ${knownRatio} = ${unitSize}\n${p.kind === "shareTotal" ? `전체 = ${unitSize} × ${a + b}` : `${unitSize} × ${v.ratio![v.ask!]}`} = ${p.answer}`,
      };
    }
    case "difference": {
      const [big, small] = v.ratio!;
      const unit = v.diff! / (big - small);
      return {
        question: `${josa(n(0), "과", "와")} ${n(1)}의 레벨 비는 ${r(v.ratio!)}이고,\n레벨 차이는 ${v.diff}입니다.\n\n${v.ask === 0 ? n(0) : n(1)}의 레벨은?`,
        unit: "",
        hint: `비의 차 ${big} - ${small} = ${big - small}칸이 실제로 ${v.diff}만큼이에요.\n한 칸의 크기를 먼저 구해 보세요.`,
        explanation: `비의 차 = ${big} - ${small} = ${big - small}\n한 칸 = ${v.diff} ÷ ${big - small} = ${unit}\n${v.ratio![v.ask!]} × ${unit} = ${p.answer}`,
      };
    }
    case "connected": {
      const [a1, b1] = v.ab!;
      const [b2, c2] = v.bc!;
      const shown = v.result!.map((x, i) => (i === v.ask ? "□" : x));
      return {
        question: `${n(0)} : ${n(1)} = ${r([a1, b1])}\n${n(1)} : ${n(2)} = ${r([b2, c2])}일 때\n${n(0)} : ${n(1)} : ${n(2)} = ${r(shown)}\n□는? (가장 간단한 자연수의 비)`,
        unit: "",
        hint: `가운데(${n(1)})의 수 ${josa(String(b1), "과", "와")} ${josa(String(b2), "을", "를")}\n최소공배수 ${josaRo(String(lcmOf(b1, b2)))} 맞춰 보세요.`,
        explanation: `${r([a1, b1])} → ${r([(a1 * lcmOf(b1, b2)) / b1, lcmOf(b1, b2)])}\n${r([b2, c2])} → ${r([lcmOf(b1, b2), (c2 * lcmOf(b1, b2)) / b2])}\n→ ${r(v.result!)}  □ = ${p.answer}`,
      };
    }
  }
}

function formatEn(p: MathProblem, n: (i: number) => string): Body {
  const v = p.v;
  switch (p.kind) {
    case "proportion":
    case "proportionDecimal":
    case "proportionFraction":
      return { question: `Fill in the box.\n\n${eq(v.terms!, v.blank)}`, unit: "", ...proportionParts(p, "en") };
    case "meansProduct": {
      const filled = v.terms!.map((t, i) => (i === v.blank ? "□" : t));
      const known = v.ask === 0 ? `${v.terms![1]} × ${v.terms![2]}` : `${v.terms![0]} × ${v.terms![3]}`;
      return {
        question: `In ${r(filled.slice(0, 2))} = ${r(filled.slice(2))},\nwhat is the product of the ${v.ask === 0 ? "extremes" : "means"}?`,
        unit: "",
        hint: `Extremes and means have the same product.\nCompute ${known}.`,
        explanation: `${known} = ${p.answer}`,
      };
    }
    case "isProportion": {
      const lines = v.choices!.map((c, i) => `${i + 1}) ${r(c.slice(0, 2))} = ${r(c.slice(2))}`).join("\n");
      const right = v.choices![p.answer - 1];
      return {
        question: `Which one is a true proportion?\n${lines}`,
        unit: "",
        hint: "Look for the one where extremes × = means ×.",
        explanation: `#${p.answer}: ${right[0]} × ${right[3]} = ${right[1]} × ${right[2]}`,
      };
    }
    case "ratioProperty": {
      const [a, b] = v.ratio!;
      const k = v.k!;
      if (v.op === "mul") {
        return {
          question: `Multiply both terms of ${r([a, b])} by ${k}:\n${v.ask === 0 ? `□ : ${b * k}` : `${a * k} : □`}`,
          unit: "",
          hint: "Multiplying both terms by the same number keeps the ratio.",
          explanation: `${a} × ${k} = ${a * k}, ${b} × ${k} = ${b * k}`,
        };
      }
      return {
        question: `Divide both terms of ${r([a * k, b * k])} by ${k}:\n${v.ask === 0 ? `□ : ${b}` : `${a} : □`}`,
        unit: "",
        hint: "Dividing both terms by the same number keeps the ratio.",
        explanation: `${a * k} ÷ ${k} = ${a}, ${b * k} ÷ ${k} = ${b}`,
      };
    }
    case "simplify":
    case "simplifyDecimal":
    case "simplifyFraction": {
      const [x, y] = v.ratio!;
      const [a, b] = v.result!;
      const shownRatio =
        p.kind === "simplify"
          ? r([x, y])
          : p.kind === "simplifyDecimal"
            ? r([decimalStr(x), decimalStr(y)])
            : r([`1/${x}`, `1/${y}`]);
      return {
        question: `Write ${shownRatio} in simplest whole numbers:\n${v.ask === 0 ? `□ : ${b}` : `${a} : □`}`,
        unit: "",
        hint:
          p.kind === "simplifyDecimal"
            ? "Multiply both terms by 10 first."
            : p.kind === "simplifyFraction"
              ? `Multiply both terms by ${x * y}.`
              : `Divide both terms by ${gcdOf(x, y)}.`,
        explanation: `${r([a, b])}  □ = ${p.answer}`,
      };
    }
    case "directProportion": {
      const [question, unit] = DIRECT.en[v.context!](v.a!, v.A!, v.b!);
      return {
        question,
        unit,
        hint: `Set up ${v.a} : ${v.A} = ${v.b} : □`,
        explanation: `${v.a} × □ = ${v.A} × ${v.b}\n□ = ${p.answer}`,
      };
    }
    case "mapScale":
      return {
        question: `On a map with scale 1 : ${v.scale},\na road is ${v.mapCm}cm long.\nHow many meters is it really?`,
        unit: "m",
        hint: `${v.mapCm} × ${v.scale} cm, then ÷ 100 for meters.`,
        explanation: `${v.mapCm} × ${v.scale} = ${v.mapCm! * v.scale!}cm = ${p.answer}m`,
      };
    case "mapScaleReverse":
      return {
        question: `On a map with scale 1 : ${v.scale},\nhow many cm is a real distance of ${v.realM}m?`,
        unit: "cm",
        hint: `${v.realM}m = ${v.realM! * 100}cm. Divide by ${v.scale}.`,
        explanation: `${v.realM! * 100} ÷ ${v.scale} = ${p.answer}cm`,
      };
    case "gears": {
      const [small, big] = v.teeth!;
      const askSmall = v.ask === 0;
      return {
        question: `Gear A has ${small} teeth, gear B has ${big}.\nWhen ${askSmall ? "B" : "A"} turns ${v.turns} times,\nhow many times does ${askSmall ? "A" : "B"} turn?`,
        unit: "",
        hint: "Teeth × turns is the same for both gears.",
        explanation: `${askSmall ? big : small} × ${v.turns} = ${askSmall ? small : big} × □\n□ = ${p.answer}`,
      };
    }
    case "rectangle": {
      const [a, b] = v.ratio!;
      return {
        question: `A rectangle's width : height = ${r([a, b])}.\nIts perimeter is ${v.total}cm.\nWhat is its ${v.ask === 0 ? "width" : "height"}?`,
        unit: "cm",
        hint: `Width + height = ${v.total! / 2}cm. Share it in ${r([a, b])}.`,
        explanation: `${v.total! / 2} × ${[a, b][v.ask!]}/${a + b} = ${p.answer}`,
      };
    }
    case "share2":
    case "share3": {
      const item = ITEMS.en[v.item!];
      const who = v.ratio!.map((_, i) => n(i));
      const sum = v.ratio!.reduce((x, y) => x + y, 0);
      const list = who.length === 2 ? `${who[0]} and ${who[1]}` : `${who[0]}, ${who[1]} and ${who[2]}`;
      return {
        question: `${v.total} ${item.name} are shared by\n${list}\nin the ratio ${r(v.ratio!)}.\n\nHow much does ${who[v.ask!]} get?`,
        unit: item.unit,
        hint: `Total parts = ${v.ratio!.join(" + ")} = ${sum}\n${who[v.ask!]} gets ${v.ratio![v.ask!]}/${sum} of the total.`,
        explanation: `${v.total} ÷ ${sum} × ${v.ratio![v.ask!]}\n= ${v.total! / sum} × ${v.ratio![v.ask!]} = ${p.answer}`,
      };
    }
    case "shareOther":
    case "shareTotal": {
      const item = ITEMS.en[v.item!];
      const knownRatio = v.ratio![v.knownIdx!];
      const unitSize = v.known! / knownRatio;
      return {
        question: `${item.name} were shared by ${n(0)} and ${n(1)}\nin the ratio ${r(v.ratio!)}.\n${n(v.knownIdx!)} got ${v.known}.\n${p.kind === "shareTotal" ? "How many were there in total?" : `How much did ${n(v.ask!)} get?`}`,
        unit: item.unit,
        hint: `One part = ${v.known} ÷ ${knownRatio}`,
        explanation: `One part = ${unitSize}\n= ${p.answer}`,
      };
    }
    case "difference": {
      const [big, small] = v.ratio!;
      const unit = v.diff! / (big - small);
      return {
        question: `The levels of ${n(0)} and ${n(1)} are in the ratio ${r(v.ratio!)}.\nTheir difference is ${v.diff}.\n\nWhat is ${v.ask === 0 ? n(0) : n(1)}'s level?`,
        unit: "",
        hint: `The ratio gap ${big} - ${small} = ${big - small} parts equals ${v.diff}.\nFind the size of one part first.`,
        explanation: `One part = ${v.diff} ÷ ${big - small} = ${unit}\n${v.ratio![v.ask!]} × ${unit} = ${p.answer}`,
      };
    }
    case "connected": {
      const shown = v.result!.map((x, i) => (i === v.ask ? "□" : x));
      return {
        question: `A : B = ${r(v.ab!)}, B : C = ${r(v.bc!)}\nA : B : C = ${r(shown)}\n(simplest whole numbers)`,
        unit: "",
        hint: `Make B equal using the LCM ${lcmOf(v.ab![1], v.bc![0])}.`,
        explanation: `A : B : C = ${r(v.result!)}  □ = ${p.answer}`,
      };
    }
  }
}

function gcdOf(a: number, b: number): number {
  return b === 0 ? a : gcdOf(b, a % b);
}

function lcmOf(a: number, b: number): number {
  return (a / gcdOf(a, b)) * b;
}

/** 10배 값(정수)을 소수 문자열로 */
function decimalStr(tenths: number): string {
  return tenths % 10 === 0 ? String(tenths / 10) : (tenths / 10).toFixed(1);
}
