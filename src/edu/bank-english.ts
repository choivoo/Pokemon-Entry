/**
 * 영어 문제 (초등 1~6학년): 단어·문장 모음과 생성기.
 * 단어는 분류(동물, 음식 …)별로 적어 두고, 뜻 고르기 · 영어로 쓰기 · 빠진 글자 · 다른 하나 고르기 문제를 자동으로 만든다.
 */

import { choiceQ, type Level, type Question, type QuestionBase, shuffle } from "#app/edu/question";
import { pick, type Rng, randInt } from "#app/math/math-problems";
import { josa } from "#app/math/math-text";

export interface Word {
  en: string;
  ko: string;
  cat: string;
  /** 처음 나오는 학기(0~11) */
  from: number;
}

/** "분류:영어=뜻,영어=뜻" 형식 */
const WORD_DATA: [number, string[]][] = [
  [
    0,
    [
      "동물:dog=개,cat=고양이,bird=새,fish=물고기,pig=돼지,cow=소,duck=오리,rabbit=토끼,horse=말,lion=사자,monkey=원숭이,elephant=코끼리,bear=곰,tiger=호랑이,frog=개구리,mouse=쥐",
      "색깔:red=빨간색,blue=파란색,yellow=노란색,green=초록색,pink=분홍색,black=검은색,white=흰색,brown=갈색,purple=보라색",
      "숫자:one=1,two=2,three=3,four=4,five=5,six=6,seven=7,eight=8,nine=9,ten=10",
      "과일:apple=사과,banana=바나나,grape=포도,melon=멜론,lemon=레몬,peach=복숭아,strawberry=딸기,watermelon=수박,pear=배,cherry=체리",
      "가족:mother=어머니,father=아버지,grandmother=할머니,grandfather=할아버지,baby=아기,friend=친구",
      "몸:head=머리,eye=눈,nose=코,mouth=입,ear=귀,hand=손,foot=발,arm=팔,leg=다리",
    ],
  ],
  [
    4,
    [
      "학교:book=책,pencil=연필,desk=책상,chair=의자,bag=가방,eraser=지우개,ruler=자,notebook=공책,teacher=선생님,student=학생,classroom=교실,library=도서관,playground=운동장,scissors=가위,crayon=크레파스",
      "음식:bread=빵,milk=우유,rice=밥,egg=달걀,cheese=치즈,pizza=피자,juice=주스,cake=케이크,soup=수프,salad=샐러드,noodle=국수,hamburger=햄버거,cookie=쿠키,water=물",
      "장소:school=학교,house=집,park=공원,zoo=동물원,hospital=병원,store=가게,bank=은행,museum=박물관,airport=공항,farm=농장,restaurant=식당",
      "날씨:sunny=맑은,rainy=비 오는,cloudy=흐린,snowy=눈 오는,windy=바람 부는,hot=더운,cold=추운,warm=따뜻한,cool=시원한",
      "요일:Monday=월요일,Tuesday=화요일,Wednesday=수요일,Thursday=목요일,Friday=금요일,Saturday=토요일,Sunday=일요일",
      "옷:shirt=셔츠,pants=바지,shoes=신발,hat=모자,coat=외투,dress=원피스,socks=양말,skirt=치마,jacket=재킷,glasses=안경",
      "동작:run=달리다,jump=뛰다,swim=수영하다,eat=먹다,drink=마시다,sleep=자다,read=읽다,write=쓰다,sing=노래하다,dance=춤추다,walk=걷다,open=열다,close=닫다,draw=그리다,cook=요리하다,wash=씻다,sit=앉다,stand=서다",
      "모습:big=큰,small=작은,long=긴,short=짧은,tall=키가 큰,happy=행복한,sad=슬픈,fast=빠른,slow=느린,new=새로운,old=오래된,hungry=배고픈,thirsty=목마른,angry=화난,tired=피곤한,beautiful=아름다운,funny=웃긴",
      "달:January=1월,February=2월,March=3월,April=4월,May=5월,June=6월,July=7월,August=8월,September=9월,October=10월,November=11월,December=12월",
    ],
  ],
  [
    8,
    [
      "직업:doctor=의사,nurse=간호사,farmer=농부,firefighter=소방관,chef=요리사,singer=가수,pilot=조종사,dentist=치과의사,scientist=과학자,artist=화가,driver=운전사,baker=제빵사,writer=작가,engineer=기술자,actor=배우",
      "나라:Korea=한국,Japan=일본,China=중국,America=미국,England=영국,Canada=캐나다,France=프랑스,Australia=호주,India=인도,Italy=이탈리아,Germany=독일,Egypt=이집트,Brazil=브라질,Thailand=태국",
      "운동:soccer=축구,baseball=야구,basketball=농구,tennis=테니스,badminton=배드민턴,volleyball=배구,taekwondo=태권도,fishing=낚시,skating=스케이트,skiing=스키",
      "탈것:bus=버스,train=기차,subway=지하철,taxi=택시,bike=자전거,car=자동차,plane=비행기,ship=배,truck=트럭,boat=보트",
      "과목:math=수학,science=과학,English=영어,music=음악,art=미술,history=역사",
      "위치:left=왼쪽,right=오른쪽,straight=곧장,corner=모퉁이,behind=뒤에,between=사이에",
      "기분:excited=신난,bored=지루한,scared=무서워하는,surprised=놀란,nervous=긴장한,proud=자랑스러운,sleepy=졸린,sick=아픈,glad=기쁜,worried=걱정하는",
      "자연:mountain=산,river=강,sea=바다,forest=숲,island=섬,desert=사막,lake=호수,beach=해변,sky=하늘,star=별,moon=달,cloud=구름",
      "말:always=항상,usually=보통,sometimes=가끔,often=자주,today=오늘,tomorrow=내일,yesterday=어제,vacation=방학,birthday=생일,weekend=주말,together=함께,favorite=가장 좋아하는,expensive=비싼,cheap=싼,dangerous=위험한,important=중요한,delicious=맛있는,popular=인기 있는,clean=깨끗한,dirty=더러운",
    ],
  ],
];

export const WORDS: Word[] = WORD_DATA.flatMap(([from, lines]) =>
  lines.flatMap(line => {
    const [cat, rest] = line.split(":");
    return rest.split(",").map(pair => {
      const [en, ko] = pair.split("=");
      return { en, ko, cat, from };
    });
  }),
);

const mk = (kind: string, category: string, level: Level): QuestionBase => ({ subject: "eng", kind, category, level });

/** 지금 학기에서 쓸 수 있는 단어 (너무 쉬운 옛 단어는 빼 준다) */
function wordPool(term: number): Word[] {
  return WORDS.filter(w => w.from <= term && w.from >= term - 5);
}

/** 정답 단어와 같은 분류(수준이 높을수록) 또는 아무 분류에서 오답 후보를 고른다 */
function distractorWords(rng: Rng, pool: Word[], target: Word, lv: Level): Word[] {
  const same = pool.filter(w => w.cat === target.cat && w.en !== target.en);
  const other = pool.filter(w => w.cat !== target.cat);
  const first = lv >= 3 && same.length >= 3 ? same : [...same.slice(0, 1), ...other];
  return shuffle(rng, first).slice(0, 6);
}

type Gen = (rng: Rng, lv: Level, term: number) => Question;

export const ENG_GENS: Record<string, Gen> = {
  /** 영어 낱말의 뜻 고르기 */
  meaning: (rng, lv, term) => {
    const pool = wordPool(term);
    const w = pick(rng, pool);
    const d = distractorWords(rng, pool, w, lv);
    return choiceQ(
      rng,
      mk("meaning", "단어 뜻", lv),
      `'${w.en}'의 뜻은?`,
      w.ko,
      d.map(x => x.ko),
      `${w.cat}에 관한 낱말이에요.`,
      `${w.en} = ${w.ko}`,
    );
  },
  /** 우리말을 영어로 */
  toEnglish: (rng, lv, term) => {
    const pool = wordPool(term);
    const w = pick(rng, pool);
    const d = distractorWords(rng, pool, w, lv);
    return choiceQ(
      rng,
      mk("toEnglish", "영어로 말하기", lv),
      `'${w.ko}'${josa(w.ko, "을", "를")} 영어로 하면?`,
      w.en,
      d.map(x => x.en),
      `${w.cat}에 관한 낱말이에요. 첫 글자는 '${w.en[0]}'`,
      `${w.ko} = ${w.en}`,
    );
  },
  /** 빠진 글자 */
  spelling: (rng, lv, term) => {
    const pool = wordPool(term).filter(w => /^[A-Za-z]{3,10}$/.test(w.en));
    const w = pick(rng, pool);
    const i = randInt(rng, 1, w.en.length - 2);
    const letter = w.en[i];
    const shown = `${w.en.slice(0, i)}_${w.en.slice(i + 1)}`;
    const letters = "abcdefghijklmnopqrstuvwxyz".split("").filter(c => c !== letter.toLowerCase());
    return choiceQ(
      rng,
      mk("spelling", "철자", lv),
      `${w.ko}: ${shown}\n빈칸에 들어갈 알파벳은?`,
      letter,
      shuffle(rng, letters)
        .slice(0, 5)
        .map(c => (letter === letter.toUpperCase() ? c.toUpperCase() : c)),
      `'${w.ko}'${josa(w.ko, "을", "를")} 영어로 써 보세요.`,
      `${w.en} (${w.ko})`,
    );
  },
  /** 다른 하나 고르기 */
  oddOne: (rng, lv, term) => {
    const pool = wordPool(term);
    const cats = [...new Set(pool.map(w => w.cat))].filter(c => pool.filter(w => w.cat === c).length >= 3);
    const cat = pick(rng, cats);
    const group = shuffle(
      rng,
      pool.filter(w => w.cat === cat),
    ).slice(0, 3);
    const odd = pick(
      rng,
      pool.filter(w => w.cat !== cat),
    );
    return choiceQ(
      rng,
      mk("oddOne", "낱말 분류", lv),
      "나머지와 종류가 다른 하나는?",
      odd.en,
      group.map(w => w.en),
      `세 개는 '${cat}'에 관한 낱말이에요.`,
      `${group.map(w => w.en).join(", ")}은(는) ${cat}, ${odd.en}(${odd.ko})은(는) 아니에요.`,
    );
  },
  /** 알파벳 (1~2학년) */
  alphabet: (rng, lv) => {
    const up = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const i = randInt(rng, 0, 24);
    const t = randInt(rng, 0, 2);
    const c = up[i];
    if (t === 0) {
      return choiceQ(
        rng,
        mk("alphabet", "알파벳", lv),
        `대문자 ${c}의 소문자는?`,
        c.toLowerCase(),
        shuffle(
          rng,
          up.split("").filter(x => x !== c),
        )
          .slice(0, 5)
          .map(x => x.toLowerCase()),
        "대문자와 소문자의 짝을 떠올려 보세요.",
        `${c} - ${c.toLowerCase()}`,
      );
    }
    if (t === 1) {
      return choiceQ(
        rng,
        mk("alphabet", "알파벳", lv),
        `${c} 바로 다음 알파벳은?`,
        up[i + 1],
        shuffle(
          rng,
          up.split("").filter(x => x !== up[i + 1]),
        ).slice(0, 5),
        "ABC 노래를 떠올려 보세요.",
        `${c} 다음은 ${up[i + 1]}`,
      );
    }
    return choiceQ(
      rng,
      mk("alphabet", "알파벳", lv),
      `${up[i]}, ${up[i + 1]}, ___ 에 들어갈 알파벳은?`,
      up[Math.min(i + 2, 25)],
      shuffle(
        rng,
        up.split("").filter(x => x !== up[Math.min(i + 2, 25)]),
      ).slice(0, 5),
      "알파벳 순서대로 이어 보세요.",
      `${up[i]}, ${up[i + 1]}, ${up[Math.min(i + 2, 25)]}`,
    );
  },
  /** 문장 고르기 */
  sentence: (rng, lv, term) => {
    const items = SENTENCES.filter(s => s.from <= term && term <= s.to);
    const s = pick(rng, items.length > 0 ? items : SENTENCES);
    return choiceQ(rng, mk("sentence", s.cat, lv), s.q, s.a, s.wrong, s.hint, s.exp ?? `정답: ${s.a}`);
  },
};

interface SentenceItem {
  from: number;
  to: number;
  cat: string;
  /** 문제 (빈칸은 ___) */
  q: string;
  a: string;
  wrong: string[];
  hint: string;
  exp?: string;
}

const S = (
  from: number,
  to: number,
  cat: string,
  q: string,
  a: string,
  wrong: string[],
  hint: string,
  exp?: string,
): SentenceItem => ({
  from,
  to,
  cat,
  q,
  a,
  wrong,
  hint,
  ...(exp ? { exp } : {}),
});

/** 문장 문제 (빈칸 채우기, 대화) */
export const SENTENCES: SentenceItem[] = [
  // 1~2학년
  S(
    0,
    5,
    "관사",
    "This is ___ apple.",
    "an",
    ["a", "two", "are"],
    "a, e, i, o, u 소리로 시작하는 낱말 앞에는 an을 써요.",
    "apple은 모음 소리로 시작해서 an apple",
  ),
  S(
    0,
    5,
    "관사",
    "This is ___ dog.",
    "a",
    ["an", "are", "is"],
    "자음 소리로 시작하는 낱말 앞에는 a를 써요.",
    "dog은 자음 소리로 시작해서 a dog",
  ),
  S(0, 7, "be동사", "I ___ a student.", "am", ["is", "are", "be"], "I 다음에는 am을 써요.", "I am"),
  S(
    0,
    7,
    "인사",
    "How are you?\n— I'm ___, thank you.",
    "fine",
    ["red", "dog", "six"],
    "안부를 묻는 말에 대한 대답이에요.",
    "I'm fine, thank you. (잘 지내요, 고마워요.)",
  ),
  S(
    0,
    5,
    "인사",
    "Nice to ___ you.",
    "meet",
    ["eat", "run", "sit"],
    "처음 만났을 때 하는 인사예요.",
    "Nice to meet you. (만나서 반가워요.)",
  ),
  S(
    0,
    3,
    "인사",
    "아침에 하는 인사는?\nGood ___.",
    "morning",
    ["night", "bye", "sorry"],
    "morning은 아침이라는 뜻이에요.",
    "Good morning. (좋은 아침이에요.)",
  ),
  S(
    0,
    3,
    "숫자",
    "one, two, ___, four",
    "three",
    ["five", "six", "ten"],
    "숫자를 차례로 세어 보세요.",
    "one, two, three, four",
  ),
  S(
    0,
    5,
    "대화",
    "Thank you.\n— You're ___.",
    "welcome",
    ["fine", "sorry", "hello"],
    "고맙다는 말에 대한 대답이에요.",
    "You're welcome. (천만에요.)",
  ),
  S(
    0,
    7,
    "대화",
    "What's your name?\n— ___ name is Mina.",
    "My",
    ["I", "Me", "Am"],
    "'나의'라는 뜻의 낱말을 골라요.",
    "My name is Mina. (내 이름은 미나예요.)",
  ),
  // 3~4학년
  S(
    4,
    9,
    "be동사",
    "He ___ a teacher.",
    "is",
    ["am", "are", "be"],
    "He, She, It 다음에는 is를 써요.",
    "He is a teacher.",
  ),
  S(
    4,
    9,
    "be동사",
    "They ___ my friends.",
    "are",
    ["is", "am", "be"],
    "They, We, You 다음에는 are를 써요.",
    "They are my friends.",
  ),
  S(
    4,
    9,
    "have",
    "She ___ a cat.",
    "has",
    ["have", "am", "is"],
    "He, She, It 다음에는 have 대신 has를 써요.",
    "She has a cat.",
  ),
  S(4, 9, "have", "I ___ a pencil.", "have", ["has", "am", "is"], "I 다음에는 have를 써요.", "I have a pencil."),
  S(
    4,
    9,
    "의문사",
    "___ is this?\n— It's a book.",
    "What",
    ["Who", "Where", "When"],
    "물건이 무엇인지 묻는 말이에요.",
    "What is this? (이것은 무엇이니?)",
  ),
  S(
    4,
    9,
    "의문사",
    "___ are you?\n— I'm at school.",
    "Where",
    ["Who", "What", "How"],
    "장소를 묻는 말이에요.",
    "Where are you? (너는 어디에 있니?)",
  ),
  S(
    4,
    9,
    "의문사",
    "___ is he?\n— He's my brother.",
    "Who",
    ["Where", "What", "When"],
    "사람이 누구인지 묻는 말이에요.",
    "Who is he? (그는 누구니?)",
  ),
  S(
    4,
    9,
    "의문사",
    "___ much is it?\n— It's ten dollars.",
    "How",
    ["What", "Who", "Where"],
    "가격을 물을 때는 How much?",
    "How much is it? (얼마예요?)",
  ),
  S(
    4,
    9,
    "의문사",
    "___ time is it?\n— It's three o'clock.",
    "What",
    ["Who", "Where", "How"],
    "시각을 물을 때는 What time?",
    "What time is it? (몇 시예요?)",
  ),
  S(
    4,
    9,
    "일반동사",
    "She ___ to school by bus.",
    "goes",
    ["go", "going", "gone"],
    "She 다음의 동사에는 s나 es를 붙여요.",
    "She goes to school by bus.",
  ),
  S(
    4,
    9,
    "일반동사",
    "He ___ soccer every day.",
    "plays",
    ["play", "playing", "played"],
    "He 다음의 동사에는 s를 붙여요. (매일 하는 일)",
    "He plays soccer every day.",
  ),
  S(
    4,
    9,
    "조동사",
    "I can ___ the piano. (피아노를 칠 수 있다)",
    "play",
    ["plays", "playing", "played"],
    "can 다음에는 동사 원형을 써요.",
    "I can play the piano.",
  ),
  S(
    4,
    9,
    "there is/are",
    "There ___ a book on the desk.",
    "is",
    ["are", "am", "be"],
    "하나일 때는 There is",
    "There is a book on the desk.",
  ),
  S(
    4,
    9,
    "there is/are",
    "There ___ two cats under the table.",
    "are",
    ["is", "am", "be"],
    "둘 이상일 때는 There are",
    "There are two cats.",
  ),
  S(
    4,
    9,
    "전치사",
    "The book is ___ the desk. (책상 위에)",
    "on",
    ["in", "under", "behind"],
    "on은 '~ 위에'라는 뜻이에요.",
    "on the desk = 책상 위에",
  ),
  S(
    4,
    9,
    "전치사",
    "The ball is ___ the box. (상자 안에)",
    "in",
    ["on", "under", "next"],
    "in은 '~ 안에'라는 뜻이에요.",
    "in the box = 상자 안에",
  ),
  S(
    4,
    9,
    "전치사",
    "I get up ___ seven o'clock.",
    "at",
    ["on", "in", "to"],
    "시각 앞에는 at을 써요.",
    "at seven o'clock",
  ),
  S(4, 9, "전치사", "My birthday is ___ May 5th.", "on", ["in", "at", "to"], "날짜 앞에는 on을 써요.", "on May 5th"),
  S(
    4,
    9,
    "복수형",
    "one box, two ___",
    "boxes",
    ["box", "boxs", "boxies"],
    "x로 끝나는 낱말에는 es를 붙여요.",
    "boxes",
  ),
  S(
    4,
    9,
    "복수형",
    "I have two ___. (책 두 권)",
    "books",
    ["book", "bookes", "bookies"],
    "둘 이상이면 낱말 끝에 s를 붙여요.",
    "two books",
  ),
  S(
    4,
    9,
    "명령문",
    "___ quiet, please.",
    "Be",
    ["Is", "Are", "Am"],
    "명령문은 동사 원형으로 시작해요.",
    "Be quiet, please. (조용히 해 주세요.)",
  ),
  S(
    4,
    9,
    "날씨",
    "It's ___ today. (맑아요)",
    "sunny",
    ["rainy", "snowy", "windy"],
    "맑은 날씨를 나타내는 낱말이에요.",
    "It's sunny today.",
  ),
  S(
    4,
    9,
    "대화",
    "How old are you? (너는 몇 살이니?)\n— ___",
    "I'm eleven.",
    ["I'm red.", "I'm Monday.", "I'm fine."],
    "나이를 말하는 문장을 찾아보세요.",
    "How old are you? — I'm eleven.",
  ),
  // 5~6학년
  S(
    8,
    11,
    "현재진행",
    "I am ___ a book now. (지금 읽고 있다)",
    "reading",
    ["read", "reads", "readed"],
    "'~하고 있다'는 동사원형에 -ing를 붙여요.",
    "I am reading a book now.",
  ),
  S(
    8,
    11,
    "현재진행",
    "She is ___ lunch. (점심을 먹고 있다)",
    "eating",
    ["eat", "eats", "ate"],
    "is 다음에는 동사 -ing",
    "She is eating lunch.",
  ),
  S(
    8,
    11,
    "현재진행",
    "They are ___ soccer. (축구를 하고 있다)",
    "playing",
    ["play", "plays", "played"],
    "are 다음에는 동사 -ing",
    "They are playing soccer.",
  ),
  S(
    8,
    11,
    "과거",
    "I ___ to the zoo yesterday.",
    "went",
    ["go", "goes", "going"],
    "go의 과거형은 went예요.",
    "I went to the zoo yesterday.",
  ),
  S(
    8,
    11,
    "과거",
    "He ___ happy yesterday.",
    "was",
    ["is", "are", "be"],
    "어제의 일이니까 과거형이에요. (am, is → was)",
    "He was happy yesterday.",
  ),
  S(
    8,
    11,
    "과거",
    "We ___ at home last night.",
    "were",
    ["are", "is", "was"],
    "We의 과거형은 were예요. (are → were)",
    "We were at home last night.",
  ),
  S(
    8,
    11,
    "과거",
    "She ___ a cake last Sunday. (만들었다)",
    "made",
    ["make", "makes", "maked"],
    "make의 과거형은 made예요.",
    "She made a cake.",
  ),
  S(
    8,
    11,
    "과거",
    "I ___ TV yesterday. (봤다)",
    "watched",
    ["watch", "watches", "watching"],
    "규칙 동사는 -ed를 붙여요.",
    "I watched TV yesterday.",
  ),
  S(
    8,
    11,
    "과거",
    "Did you ___ breakfast?",
    "eat",
    ["ate", "eats", "eating"],
    "Did 다음에는 동사 원형을 써요.",
    "Did you eat breakfast? (아침 먹었니?)",
  ),
  S(
    8,
    11,
    "미래",
    "I will ___ my grandma tomorrow. (방문할 것이다)",
    "visit",
    ["visited", "visits", "visiting"],
    "will 다음에는 동사 원형을 써요.",
    "I will visit my grandma tomorrow.",
  ),
  S(
    8,
    11,
    "미래",
    "It will ___ tomorrow. (비가 올 것이다)",
    "rain",
    ["rains", "rained", "raining"],
    "will 다음에는 동사 원형을 써요.",
    "It will rain tomorrow.",
  ),
  S(
    8,
    11,
    "미래",
    "I am going to ___ a bike. (탈 것이다)",
    "ride",
    ["rides", "rode", "riding"],
    "be going to 다음에도 동사 원형이에요.",
    "I am going to ride a bike.",
  ),
  S(
    8,
    11,
    "비교",
    "An elephant is ___ than a dog. (더 큰)",
    "bigger",
    ["big", "biggest", "more big"],
    "'더 ~한'은 -er을 붙여요. big은 g를 한 번 더 써요.",
    "bigger than",
  ),
  S(
    8,
    11,
    "비교",
    "Tom is ___ than Mina. (키가 더 큰)",
    "taller",
    ["tall", "tallest", "more tall"],
    "'더 ~한'은 -er을 붙여요.",
    "taller than",
  ),
  S(
    8,
    11,
    "비교",
    "She is the ___ student in my class. (가장 키가 큰)",
    "tallest",
    ["taller", "tall", "most tall"],
    "'가장 ~한'은 the + -est",
    "the tallest",
  ),
  S(
    8,
    11,
    "비교",
    "This is the ___ book. (가장 재미있는)",
    "most interesting",
    ["more interesting", "interestinger", "interestingest"],
    "긴 낱말은 most를 앞에 써요.",
    "the most interesting",
  ),
  S(
    8,
    11,
    "의문사",
    "___ is your favorite subject?\n— Math.",
    "What",
    ["Who", "Where", "When"],
    "무엇인지 묻는 말이에요.",
    "What is your favorite subject?",
  ),
  S(
    8,
    11,
    "의문사",
    "___ do you go to school?\n— By bus.",
    "How",
    ["What", "Who", "When"],
    "방법을 묻는 말이에요.",
    "How do you go to school?",
  ),
  S(
    8,
    11,
    "의문사",
    "___ is your birthday?\n— It's June 3rd.",
    "When",
    ["Who", "Where", "How"],
    "때를 묻는 말이에요.",
    "When is your birthday?",
  ),
  S(
    8,
    11,
    "의문사",
    "___ bag is this?\n— It's mine.",
    "Whose",
    ["Who", "What", "Where"],
    "'누구의'는 Whose예요.",
    "Whose bag is this?",
  ),
  S(
    8,
    11,
    "전치사",
    "She is sitting ___ me. (내 옆에)",
    "next to",
    ["on", "in", "at"],
    "'~ 옆에'는 next to",
    "next to me",
  ),
  S(
    8,
    11,
    "to부정사",
    "I want ___ a doctor. (의사가 되고 싶다)",
    "to be",
    ["be", "being", "am"],
    "want 다음에는 to + 동사 원형",
    "I want to be a doctor.",
  ),
  S(
    8,
    11,
    "동명사",
    "I enjoy ___. (수영하기를 즐긴다)",
    "swimming",
    ["swim", "swam", "to swim"],
    "enjoy 다음에는 동사 -ing",
    "I enjoy swimming.",
  ),
  S(
    8,
    11,
    "의문문",
    "What time ___ you get up?",
    "do",
    ["does", "are", "is"],
    "일반동사의 의문문은 do/does로 시작해요. (you → do)",
    "What time do you get up?",
  ),
  S(
    8,
    11,
    "대화",
    "Where are you from?\n— I'm ___ Korea.",
    "from",
    ["on", "at", "in the"],
    "출신을 말할 때는 be from",
    "I'm from Korea.",
  ),
  S(
    8,
    11,
    "대화",
    "Can I help you?\n— Yes, I'd like ___ hamburger.",
    "a",
    ["an", "two", "are"],
    "hamburger는 자음 소리로 시작해요.",
    "I'd like a hamburger.",
  ),
];

/** 학기(0~11)별 생성기 목록 (여러 번 적으면 더 자주 나온다) */
export const ENG_TERMS: string[][] = [
  ["alphabet", "alphabet", "meaning", "toEnglish", "sentence"],
  ["alphabet", "meaning", "toEnglish", "spelling", "sentence"],
  ["alphabet", "meaning", "toEnglish", "spelling", "oddOne", "sentence"],
  ["meaning", "toEnglish", "spelling", "oddOne", "sentence"],
  ["meaning", "toEnglish", "spelling", "oddOne", "sentence", "sentence"],
  ["meaning", "toEnglish", "spelling", "oddOne", "sentence", "sentence"],
  ["meaning", "toEnglish", "spelling", "oddOne", "sentence", "sentence"],
  ["meaning", "toEnglish", "spelling", "oddOne", "sentence", "sentence"],
  ["meaning", "toEnglish", "spelling", "oddOne", "sentence", "sentence", "sentence"],
  ["meaning", "toEnglish", "spelling", "oddOne", "sentence", "sentence", "sentence"],
  ["meaning", "toEnglish", "spelling", "oddOne", "sentence", "sentence", "sentence"],
  ["meaning", "toEnglish", "spelling", "oddOne", "sentence", "sentence", "sentence"],
];
