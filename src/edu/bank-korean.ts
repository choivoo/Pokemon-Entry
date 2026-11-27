/**
 * 국어 문제 (초등 1~6학년): 한글 · 낱말 · 맞춤법 · 속담 · 관용어 · 사자성어 · 품사.
 * 문제는 "학기 범위(from~to)" 안에서만 나온다.
 */

import { choiceQ, type Level, numQ, type Question, type QuestionBase, shuffle } from "#app/edu/question";
import { pick, type Rng, randInt } from "#app/math/math-problems";
import { josa } from "#app/math/math-text";

const mk = (kind: string, category: string, level: Level): QuestionBase => ({ subject: "kor", kind, category, level });

type Gen = (rng: Rng, lv: Level, term: number) => Question;

/** [처음, 끝, 앞, 뒤] */
type Pair = [number, number, string, string];

// #region 낱말 모음

/** 반대말 */
const ANTONYMS: Pair[] = [
  ...(
    [
      "크다|작다",
      "높다|낮다",
      "길다|짧다",
      "많다|적다",
      "빠르다|느리다",
      "가볍다|무겁다",
      "깊다|얕다",
      "넓다|좁다",
      "두껍다|얇다",
      "밝다|어둡다",
      "쉽다|어렵다",
      "굵다|가늘다",
      "깨끗하다|더럽다",
      "이기다|지다",
      "열다|닫다",
      "오르다|내리다",
      "앞|뒤",
      "위|아래",
      "안|밖",
      "낮|밤",
      "여름|겨울",
      "남자|여자",
      "아침|저녁",
      "오른쪽|왼쪽",
      "들어가다|나오다",
      "웃다|울다",
      "가깝다|멀다",
      "뜨겁다|차갑다",
      "즐겁다|슬프다",
      "같다|다르다",
      "일찍|늦게",
      "짜다|싱겁다",
      "딱딱하다|부드럽다",
    ] as const
  ).map(p => [0, 5, ...p.split("|")] as Pair),
  ...(
    [
      "입학|졸업",
      "찬성|반대",
      "성공|실패",
      "출발|도착",
      "증가|감소",
      "확대|축소",
      "입구|출구",
      "승리|패배",
      "수입|수출",
      "원인|결과",
      "과거|미래",
      "부분|전체",
      "긍정|부정",
      "직선|곡선",
      "장점|단점",
      "질문|대답",
      "이익|손해",
      "평화|전쟁",
      "생산|소비",
      "건강|질병",
    ] as const
  ).map(p => [4, 11, ...p.split("|")] as Pair),
];

/** 비슷한말 */
const SYNONYMS: Pair[] = (
  [
    "가끔|이따금",
    "금방|곧",
    "걱정|근심",
    "고요하다|조용하다",
    "곱다|아름답다",
    "기쁘다|즐겁다",
    "무섭다|두렵다",
    "어린이|아이",
    "책방|서점",
    "마을|동네",
    "아빠|아버지",
    "엄마|어머니",
    "낯|얼굴",
    "낱말|단어",
    "길|도로",
    "집|가옥",
    "선생님|스승",
  ] as const
).map(p => [2, 11, ...p.split("|")] as Pair);

/** 속담: [앞부분, 뒷부분] */
const PROVERBS: Pair[] = (
  [
    "가는 말이 고와야|오는 말이 곱다",
    "낮말은 새가 듣고|밤말은 쥐가 듣는다",
    "티끌 모아|태산",
    "백지장도 맞들면|낫다",
    "호랑이도 제 말 하면|온다",
    "원숭이도 나무에서|떨어진다",
    "소 잃고|외양간 고친다",
    "누워서|떡 먹기",
    "세 살 버릇|여든까지 간다",
    "아는 길도|물어 가라",
    "고래 싸움에|새우 등 터진다",
    "가랑비에|옷 젖는 줄 모른다",
    "우물 안|개구리",
    "등잔 밑이|어둡다",
    "발 없는 말이|천 리 간다",
    "하늘이 무너져도|솟아날 구멍이 있다",
    "서당 개 삼 년이면|풍월을 읊는다",
    "작은 고추가|더 맵다",
    "빛 좋은|개살구",
    "개구리 올챙이 적|생각 못 한다",
    "꿩 먹고|알 먹는다",
    "공든 탑이|무너지랴",
    "될성부른 나무는|떡잎부터 알아본다",
    "윗물이 맑아야|아랫물이 맑다",
    "말 한마디로|천 냥 빚을 갚는다",
    "시작이|반이다",
    "바늘 도둑이|소 도둑 된다",
    "뛰는 놈 위에|나는 놈 있다",
    "굴러 온 돌이|박힌 돌 뺀다",
    "목마른 사람이|우물 판다",
    "구슬이 서 말이라도|꿰어야 보배",
    "가재는|게 편",
    "열 번 찍어|안 넘어가는 나무 없다",
    "돌다리도|두들겨 보고 건너라",
  ] as const
).map(p => [4, 11, ...p.split("|")] as Pair);

/** 관용어: [관용어, 뜻] */
const IDIOMS: Pair[] = (
  [
    "발이 넓다|아는 사람이 많다",
    "입이 무겁다|말을 함부로 하지 않는다",
    "손이 크다|씀씀이가 후하다",
    "귀가 얇다|남의 말을 쉽게 믿는다",
    "간이 크다|겁이 없다",
    "배가 아프다|남이 잘되는 것을 시기한다",
    "미역국을 먹다|시험에 떨어지다",
    "눈코 뜰 새 없다|매우 바쁘다",
    "발등에 불이 떨어지다|일이 몹시 급하게 되다",
    "입이 가볍다|말을 함부로 한다",
    "어깨가 무겁다|책임감이 크다",
    "머리를 맞대다|서로 의논하다",
    "한 우물을 파다|한 가지 일에만 열중하다",
    "귀를 기울이다|주의 깊게 듣다",
    "손을 떼다|하던 일을 그만두다",
  ] as const
).map(p => [6, 11, ...p.split("|")] as Pair);

/** 사자성어: [성어, 뜻] */
const FOUR_CHAR: Pair[] = (
  [
    "일석이조|한 가지 일로 두 가지 이익을 얻음",
    "동고동락|괴로움과 즐거움을 함께함",
    "사필귀정|모든 일은 반드시 올바른 곳으로 돌아감",
    "이심전심|말하지 않아도 마음이 서로 통함",
    "자포자기|절망에 빠져 자신을 포기함",
    "우공이산|꾸준히 노력하면 큰일도 이룰 수 있음",
    "고진감래|고생 끝에 즐거움이 옴",
    "설상가상|어려운 일이 계속 겹침",
    "전화위복|불행이 바뀌어 오히려 복이 됨",
    "금상첨화|좋은 일 위에 또 좋은 일이 더해짐",
    "대기만성|크게 될 사람은 늦게 이루어짐",
    "유비무환|미리 준비해 두면 걱정이 없음",
    "죽마고우|어릴 때부터 같이 놀며 자란 친구",
    "새옹지마|인생의 좋고 나쁨은 예측하기 어려움",
    "일편단심|변하지 않는 한결같은 마음",
    "칠전팔기|여러 번 실패해도 굴하지 않고 다시 일어섬",
    "백발백중|쏘는 대로 다 맞음",
    "십중팔구|열 가운데 여덟아홉, 거의 대부분",
  ] as const
).map(p => [8, 11, ...p.split("|")] as Pair);

/** 높임말: [평소 말, 높임말] */
const HONORIFICS: Pair[] = (
  [
    "밥|진지",
    "나이|연세",
    "이름|성함",
    "집|댁",
    "생일|생신",
    "말|말씀",
    "먹다|드시다",
    "자다|주무시다",
    "있다|계시다",
    "주다|드리다",
    "묻다|여쭈다",
    "아프다|편찮으시다",
  ] as const
).map(p => [2, 11, ...p.split("|")] as Pair);

/** 세는 말: [물건, 단위] */
const COUNTERS: Pair[] = (
  [
    "신발|켤레",
    "연필|자루",
    "나무|그루",
    "집|채",
    "꽃|송이",
    "동물|마리",
    "종이|장",
    "책|권",
    "자동차|대",
    "옷|벌",
    "배추|포기",
    "달걀|판",
  ] as const
).map(p => [2, 7, ...p.split("|")] as Pair);

/** 소리 나는 대로: [쓰는 글자, 소리] */
const SOUNDS: Pair[] = (
  [
    "같이|가치",
    "굳이|구지",
    "해돋이|해도지",
    "꽃이|꼬치",
    "옷이|오시",
    "부엌에|부어케",
    "앉아|안자",
    "읽어|일거",
    "닭이|달기",
    "맑다|막따",
    "값|갑",
    "좋다|조타",
    "놓고|노코",
    "국물|궁물",
    "신라|실라",
    "학교|학꾜",
    "먹는|멍는",
    "닫는|단는",
  ] as const
).map(p => [4, 9, ...p.split("|")] as Pair);

/** 품사 낱말: [품사 이름, 낱말들] */
const POS: [string, string[]][] = [
  ["명사", ["하늘", "학교", "사과", "바다", "친구", "나무", "구름", "의자"]],
  ["동사", ["달리다", "먹다", "읽다", "웃다", "놀다", "그리다", "자다", "걷다"]],
  ["형용사", ["예쁘다", "푸르다", "높다", "차갑다", "아름답다", "작다", "향기롭다", "따뜻하다"]],
  ["부사", ["빨리", "천천히", "매우", "아주", "잘", "일찍", "활짝", "몹시"]],
];

// #endregion

// #region 맞춤법·띄어쓰기

/** 헷갈리는 낱말: [옳은 것, 틀린 것] */
const SPELLING_PAIRS: Pair[] = (
  [
    "며칠|몇일",
    "어떡해|어떻해",
    "설거지|설겆이",
    "금세|금새",
    "웬일|왠일",
    "왠지|웬지",
    "희한하다|희안하다",
    "오랜만|오랫만",
    "일부러|일부로",
    "깨끗이|깨끗히",
    "곰곰이|곰곰히",
    "틈틈이|틈틈히",
    "번번이|번번히",
    "일일이|일일히",
    "바람|바램",
    "역할|역활",
    "베개|베게",
    "찌개|찌게",
    "떡볶이|떡볶기",
    "눈곱|눈꼽",
    "깍두기|깍뚜기",
    "알맞은|알맞는",
    "걸맞은|걸맞는",
    "움큼|웅큼",
  ] as const
).map(p => [4, 11, ...p.split("|")] as Pair);

interface Fill {
  from: number;
  q: string;
  a: string;
  wrong: string[];
  exp: string;
}

/** 문장 빈칸 맞춤법 */
const SPELLING_FILL: Fill[] = [
  { from: 4, q: "그렇게 하면 안 ___요.", a: "돼", wrong: ["되"], exp: "'안 되어요'를 줄이면 '안 돼요'" },
  { from: 4, q: "나는 커서 과학자가 ___ 싶다.", a: "되고", wrong: ["돼고"], exp: "'되고'는 '되다'에 '-고'가 붙은 말" },
  { from: 4, q: "숙제를 하지 ___았다.", a: "않", wrong: ["안"], exp: "'~하지 않다'처럼 '않'은 '아니하'의 준말" },
  { from: 4, q: "감기가 빨리 ___ 좋겠다.", a: "나았으면", wrong: ["낳았으면"], exp: "병이 '낫다'는 '나았으면'" },
  { from: 4, q: "엄마가 아기를 ___.", a: "낳았다", wrong: ["나았다"], exp: "아기를 '낳다'" },
  { from: 4, q: "이 문제는 ___ 풀지?", a: "어떻게", wrong: ["어떡게"], exp: "'어떻게'는 방법을 묻는 말" },
  { from: 4, q: "___ 기분이 좋다.", a: "왠지", wrong: ["웬지"], exp: "'왠지'는 '왜인지'의 줄임말" },
  { from: 4, q: "이게 ___ 떡이냐?", a: "웬", wrong: ["왠"], exp: "'웬'은 '어찌 된'이라는 뜻" },
  {
    from: 4,
    q: "선생님께서 우리에게 ___ 주셨다.",
    a: "가르쳐",
    wrong: ["가르켜"],
    exp: "'가르치다'의 활용형은 '가르쳐'",
  },
  { from: 4, q: "손가락으로 달을 ___.", a: "가리켰다", wrong: ["가르켰다"], exp: "방향을 '가리키다'" },
  { from: 4, q: "그는 ___ 동안 앓았다.", a: "며칠", wrong: ["몇일"], exp: "'며칠'이 바른 표기" },
  { from: 4, q: "신발 끈을 ___.", a: "매다", wrong: ["메다"], exp: "끈을 묶는 것은 '매다'" },
  { from: 4, q: "가방을 어깨에 ___.", a: "메다", wrong: ["매다"], exp: "어깨에 걸치는 것은 '메다'" },
  { from: 4, q: "퀴즈의 정답을 ___.", a: "맞혔다", wrong: ["맞췄다"], exp: "문제의 답을 '맞히다'" },
  { from: 4, q: "퍼즐 조각을 ___.", a: "맞췄다", wrong: ["맞혔다"], exp: "조각을 제자리에 '맞추다'" },
  { from: 4, q: "산 ___에 마을이 있다.", a: "너머", wrong: ["넘어"], exp: "공간을 뜻할 때는 '너머'" },
  { from: 4, q: "담을 ___ 도망갔다.", a: "넘어", wrong: ["너머"], exp: "'넘다'의 활용형은 '넘어'" },
  { from: 4, q: "우체국에서 편지를 ___.", a: "부쳤다", wrong: ["붙였다"], exp: "편지를 보내는 것은 '부치다'" },
  { from: 4, q: "봉투에 우표를 ___.", a: "붙였다", wrong: ["부쳤다"], exp: "'붙이다'는 달라붙게 하는 것" },
  { from: 4, q: "___ 만나자.", a: "이따가", wrong: ["있다가"], exp: "'조금 지난 뒤에'는 '이따가'" },
  { from: 4, q: "집에 ___ 나갔다.", a: "있다가", wrong: ["이따가"], exp: "'있다'에 '-다가'가 붙은 말" },
  { from: 4, q: "나는 너와 생각이 ___.", a: "다르다", wrong: ["틀리다"], exp: "같지 않을 때는 '다르다'" },
  { from: 4, q: "문제의 답이 ___.", a: "틀렸다", wrong: ["달랐다"], exp: "맞지 않을 때는 '틀리다'" },
  { from: 4, q: "약속은 ___ 지켜야 한다.", a: "반드시", wrong: ["반듯이"], exp: "'틀림없이'는 '반드시'" },
  { from: 4, q: "줄을 ___ 그렸다.", a: "반듯이", wrong: ["반드시"], exp: "'비뚤지 않게'는 '반듯이'" },
];

interface Spacing {
  ok: string;
  wrong: string[];
}

/** 띄어쓰기 */
const SPACING: Spacing[] = [
  {
    ok: "나는 학교에 갈 수 있다.",
    wrong: ["나는 학교에 갈수 있다.", "나는 학교에갈 수 있다.", "나는학교에 갈 수 있다."],
  },
  {
    ok: "아버지께서 신문을 읽으신다.",
    wrong: ["아버지께서신문을 읽으신다.", "아버지 께서 신문을 읽으신다.", "아버지께서 신문을읽으신다."],
  },
  {
    ok: "오늘은 날씨가 참 좋다.",
    wrong: ["오늘은날씨가 참 좋다.", "오늘 은 날씨가 참 좋다.", "오늘은 날씨가참 좋다."],
  },
  { ok: "사과 세 개를 샀다.", wrong: ["사과 세개를 샀다.", "사과세 개를 샀다.", "사과 세 개를샀다."] },
  {
    ok: "내가 할 수 있는 일을 찾았다.",
    wrong: ["내가 할수 있는 일을 찾았다.", "내가 할 수있는 일을 찾았다.", "내가 할 수 있는일을 찾았다."],
  },
  {
    ok: "너는 나보다 키가 크다.",
    wrong: ["너는 나 보다 키가 크다.", "너는 나보다키가 크다.", "너는나보다 키가 크다."],
  },
  { ok: "친구와 함께 놀았다.", wrong: ["친구와함께 놀았다.", "친구 와 함께 놀았다.", "친구와 함께놀았다."] },
  {
    ok: "그 사람은 무엇이든 열심히 한다.",
    wrong: ["그 사람은 무엇 이든 열심히 한다.", "그사람은 무엇이든 열심히 한다.", "그 사람은 무엇이든열심히 한다."],
  },
  { ok: "먹을 것이 없다.", wrong: ["먹을것이 없다.", "먹을 것이없다.", "먹을 것 이 없다."] },
  {
    ok: "책을 읽는 것을 좋아한다.",
    wrong: ["책을 읽는것을 좋아한다.", "책을읽는 것을 좋아한다.", "책을 읽는 것을좋아한다."],
  },
];

// #endregion

/** 한글 자모 */
const INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const MEDIALS = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const syllable = (ini: number, med: number): string => String.fromCharCode(0xac00 + (ini * 21 + med) * 28);

/** 앞·뒤 짝에서 정답과 오답 후보를 고른다 */
function pairQuestion(
  rng: Rng,
  lv: Level,
  term: number,
  list: Pair[],
  kind: string,
  category: string,
  ask: (a: string) => string,
  hint: (a: string, b: string) => string,
  exp: (a: string, b: string) => string,
  flip = false,
): Question {
  const items = list.filter(p => p[0] <= term && term <= p[1]);
  const pool = items.length >= 4 ? items : list;
  const target = pick(rng, pool);
  const others = shuffle(
    rng,
    pool.filter(p => p !== target),
  );
  const front = flip ? target[3] : target[2];
  const back = flip ? target[2] : target[3];
  const wrong = others.map(p => (flip ? p[2] : p[3]));
  return choiceQ(
    rng,
    mk(kind, category, lv),
    ask(front),
    back,
    wrong,
    hint(target[2], target[3]),
    exp(target[2], target[3]),
  );
}

export const KOR_GENS: Record<string, Gen> = {
  antonym: (rng, lv, term) =>
    pairQuestion(
      rng,
      lv,
      term,
      ANTONYMS,
      "antonym",
      "반대말",
      a => `'${a}'의 반대말은?`,
      () => "뜻이 서로 반대인 낱말을 찾아보세요.",
      (a, b) => `${a} ↔ ${b}`,
      rng() < 0.5,
    ),
  synonym: (rng, lv, term) =>
    pairQuestion(
      rng,
      lv,
      term,
      SYNONYMS,
      "synonym",
      "비슷한말",
      a => `'${a}'와(과) 뜻이 비슷한 낱말은?`.replace("와(과)", josa(a, "과", "와").slice(a.length)),
      () => "뜻이 서로 비슷한 낱말을 찾아보세요.",
      (a, b) => `${a} ≒ ${b}`,
      rng() < 0.5,
    ),
  proverb: (rng, lv, term) =>
    pairQuestion(
      rng,
      lv,
      term,
      PROVERBS,
      "proverb",
      "속담",
      a => `속담을 완성해 보세요.\n"${a} ___"`,
      a => `앞부분 '${a}'에 이어지는 말을 떠올려 보세요.`,
      (a, b) => `${a} ${b}`,
    ),
  idiom: (rng, lv, term) =>
    pairQuestion(
      rng,
      lv,
      term,
      IDIOMS,
      "idiom",
      "관용어",
      a => `관용어 '${a}'의 뜻은?`,
      a => `'${a}'는 글자 그대로의 뜻이 아니에요.`,
      (a, b) => `${a}: ${b}`,
    ),
  fourChar: (rng, lv, term) =>
    pairQuestion(
      rng,
      lv,
      term,
      FOUR_CHAR,
      "fourChar",
      "사자성어",
      a => `사자성어 '${a}'의 뜻은?`,
      a => `'${a}'를 한 글자씩 풀어서 생각해 보세요.`,
      (a, b) => `${a}: ${b}`,
    ),
  honorific: (rng, lv, term) =>
    pairQuestion(
      rng,
      lv,
      term,
      HONORIFICS,
      "honorific",
      "높임말",
      a => `'${a}'의 높임말은?`,
      () => "어른께 쓰는 말을 떠올려 보세요.",
      (a, b) => `${a} → ${b}`,
    ),
  counter: (rng, lv, term) =>
    pairQuestion(
      rng,
      lv,
      term,
      COUNTERS,
      "counter",
      "세는 말",
      a => `${a} 한 ___\n빈칸에 알맞은 세는 말은?`,
      a => `${josa(a, "을", "를")} 셀 때 쓰는 말이에요.`,
      (a, b) => `${a} 한 ${b}`,
    ),
  sound: (rng, lv, term) =>
    pairQuestion(
      rng,
      lv,
      term,
      SOUNDS,
      "sound",
      "소리와 글자",
      a => `'${a}'을(를) 소리 나는 대로 쓰면?`.replace("을(를)", josa(a, "을", "를").slice(a.length)),
      () => "받침이 뒤 글자와 만나 소리가 달라져요.",
      (a, b) => `${a}[${b}]`,
    ),
  /** 옳은 낱말 고르기 */
  spelling: (rng, lv, term) => {
    const items = SPELLING_PAIRS.filter(p => p[0] <= term);
    const [, , ok, bad] = pick(rng, items.length > 0 ? items : SPELLING_PAIRS);
    return choiceQ(
      rng,
      mk("spelling", "맞춤법", lv),
      "바르게 쓴 낱말은?",
      ok,
      [
        bad,
        ...shuffle(
          rng,
          SPELLING_PAIRS.map(p => p[3]).filter(w => w !== bad),
        ).slice(0, 2),
      ],
      "소리와 쓰임을 잘 생각해 보세요.",
      `바른 표기: ${ok}`,
    );
  },
  /** 문장 빈칸 맞춤법 */
  fill: (rng, lv, term) => {
    const items = SPELLING_FILL.filter(f => f.from <= term);
    const f = pick(rng, items.length > 0 ? items : SPELLING_FILL);
    return choiceQ(
      rng,
      mk("fill", "맞춤법", lv),
      `빈칸에 알맞은 말은?\n${f.q}`,
      f.a,
      f.wrong,
      "비슷한 낱말의 뜻을 구분해 보세요.",
      f.exp,
    );
  },
  spacing: (rng, lv) => {
    const s = pick(rng, SPACING);
    return choiceQ(
      rng,
      mk("spacing", "띄어쓰기", lv),
      "띄어쓰기가 바른 문장은?",
      s.ok,
      s.wrong,
      "낱말과 낱말 사이는 띄어 쓰고, 조사는 붙여 써요.",
      `바른 문장: ${s.ok}`,
    );
  },
  /** 품사 */
  pos: (rng, lv) => {
    const [target, words] = pick(rng, POS);
    const correct = pick(rng, words);
    const wrong = POS.filter(([name]) => name !== target).map(([, list]) => pick(rng, list));
    const hints = new Map([
      ["명사", "사람이나 사물의 이름을 나타내는 말이에요."],
      ["동사", "움직임을 나타내는 말이에요."],
      ["형용사", "모양이나 상태를 나타내는 말이에요."],
      ["부사", "다른 말을 꾸며 주는 말이에요."],
    ]);
    return choiceQ(
      rng,
      mk("pos", "품사", lv),
      `다음 중 ${josa(target, "은", "는")}?`,
      correct,
      wrong,
      hints.get(target) ?? "품사를 생각해 보세요.",
      `${correct}: ${target}`,
    );
  },
  /** 자음·모음 글자 만들기 (1~2학년) */
  jamo: (rng, lv) => {
    const common = [0, 2, 3, 5, 6, 7, 9, 11, 12, 14, 15, 16, 17, 18].filter(
      i => i !== 1 && i !== 4 && i !== 8 && i !== 10 && i !== 13,
    );
    const ini = pick(rng, common);
    const med = pick(rng, [0, 4, 8, 13, 18, 20]);
    const correct = syllable(ini, med);
    const wrong = shuffle(rng, common)
      .slice(0, 6)
      .map(i => syllable(i, med));
    wrong.push(syllable(ini, (med + 4) % 21));
    return choiceQ(
      rng,
      mk("jamo", "글자 만들기", lv),
      `${INITIALS[ini]} + ${MEDIALS[med]} = ?`,
      correct,
      wrong,
      "자음과 모음을 합쳐 한 글자로 읽어 보세요.",
      `${INITIALS[ini]} + ${MEDIALS[med]} = ${correct}`,
    );
  },
  /** 가나다 순서 (1~2학년) */
  order: (rng, lv) => {
    const seq = "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ".split("");
    const i = randInt(rng, 0, seq.length - 4);
    return choiceQ(
      rng,
      mk("order", "가나다 순서", lv),
      `${seq[i]}, ${seq[i + 1]}, ${seq[i + 2]}, ___\n빈칸에 알맞은 자음은?`,
      seq[i + 3],
      shuffle(
        rng,
        seq.filter(c => c !== seq[i + 3]),
      ).slice(0, 5),
      "ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ ㅇ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ",
      `${seq.slice(i, i + 4).join(", ")}`,
    );
  },
  /** 글자 수 세기 (1~2학년) */
  count: (rng, lv) => {
    const w = pick(rng, [
      "사과",
      "강아지",
      "고양이",
      "자동차",
      "비행기",
      "도서관",
      "학교",
      "코끼리",
      "무지개",
      "어린이날",
      "대한민국",
      "놀이터",
      "아이스크림",
      "우리나라",
      "토끼",
      "나비",
      "바나나",
      "친구",
    ]);
    return numQ(
      mk("count", "글자 수", lv),
      `'${w}'은(는) 모두 몇 글자일까요?`.replace("은(는)", josa(w, "은", "는").slice(w.length)),
      w.length,
      "글자",
      "글자를 하나씩 손가락으로 세어 보세요.",
      `${w.split("").join(" · ")} → ${w.length}글자`,
    );
  },
  /** 받침 (1~2학년) */
  batchim: (rng, lv) => {
    const items: [string, string][] = [
      ["강", "ㅇ"],
      ["밤", "ㅁ"],
      ["달", "ㄹ"],
      ["산", "ㄴ"],
      ["책", "ㄱ"],
      ["집", "ㅂ"],
      ["옷", "ㅅ"],
      ["물", "ㄹ"],
      ["손", "ㄴ"],
      ["공", "ㅇ"],
    ];
    const [w, b] = pick(rng, items);
    return choiceQ(
      rng,
      mk("batchim", "받침", lv),
      `'${w}'의 받침은?`,
      b,
      ["ㅇ", "ㅁ", "ㄹ", "ㄴ", "ㄱ", "ㅂ", "ㅅ"],
      "글자 아래쪽에 있는 자음을 찾아보세요.",
      `'${w}'의 받침은 ${b}`,
    );
  },
  /** 문장 부호 (1~3학년) */
  punctuation: (rng, lv) => {
    const items: [string, string, string][] = [
      ["묻는 문장의 끝에 쓰는 부호는?", "?", "물음표"],
      ["놀라거나 느낌을 나타내는 문장의 끝에 쓰는 부호는?", "!", "느낌표"],
      ["설명하는 문장의 끝에 쓰는 부호는?", ".", "마침표"],
      ["'사과, 배, 귤'에서 낱말 사이에 쓰는 부호는?", ",", "쉼표"],
    ];
    const [q, a, name] = pick(rng, items);
    return choiceQ(
      rng,
      mk("punctuation", "문장 부호", lv),
      q,
      a,
      [".", "?", "!", ","],
      "문장의 끝맺음을 생각해 보세요.",
      `${name}(${a})`,
    );
  },
};

/** 학기(0~11)별 생성기 목록 */
export const KOR_TERMS: string[][] = [
  ["jamo", "jamo", "order", "count", "batchim", "punctuation"],
  ["jamo", "order", "count", "batchim", "punctuation", "antonym"],
  ["count", "punctuation", "antonym", "antonym", "synonym", "honorific", "counter"],
  ["punctuation", "antonym", "synonym", "honorific", "counter", "pos"],
  ["antonym", "synonym", "honorific", "counter", "spelling", "fill", "spacing", "proverb", "sound"],
  ["antonym", "synonym", "honorific", "counter", "spelling", "fill", "spacing", "proverb", "sound"],
  ["antonym", "synonym", "spelling", "fill", "spacing", "proverb", "idiom", "sound"],
  ["antonym", "synonym", "spelling", "fill", "spacing", "proverb", "idiom", "sound", "pos"],
  ["antonym", "synonym", "spelling", "fill", "spacing", "proverb", "idiom", "fourChar", "pos"],
  ["antonym", "synonym", "spelling", "fill", "spacing", "proverb", "idiom", "fourChar", "pos"],
  ["antonym", "spelling", "fill", "spacing", "proverb", "idiom", "fourChar", "pos"],
  ["antonym", "spelling", "fill", "spacing", "proverb", "idiom", "fourChar", "pos"],
];
