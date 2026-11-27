/**
 * 포케로그 국영수(초등): 과목과 상관없이 쓰는 공통 문제 형식.
 * - 숫자 입력형: `choices` 가 없고 `answer` 가 정답 숫자
 * - 선택형(4지선다): `choices` 가 있고 `answer` 가 정답의 번호(0부터)
 */
import { type Rng, randInt } from "#app/math/math-problems";

export type Subject = "kor" | "eng" | "math";
export const SUBJECTS: readonly Subject[] = ["kor", "eng", "math"];
export const SUBJECT_NAMES: Record<Subject, string> = { kor: "국어", eng: "영어", math: "수학" };

export type Level = 1 | 2 | 3 | 4;

export interface Question {
  subject: Subject;
  /** 문제 유형 이름(같은 유형이 연속으로 나오지 않게 하는 데 쓴다) */
  kind: string;
  /** 화면에 보이는 단원 이름 */
  category: string;
  level: Level;
  /** 문제 본문 (줄바꿈 가능, □ 는 빈칸 상자로 보인다) */
  prompt: string;
  /** 선택지 (있으면 선택형) */
  choices?: string[];
  /** 숫자 입력형이면 정답 숫자, 선택형이면 정답 번호(0부터) */
  answer: number;
  /** 답 뒤에 붙는 단위 */
  unit: string;
  hint: string;
  explanation: string;
}

export interface QuestionBase {
  subject: Subject;
  kind: string;
  category: string;
  level: Level;
}

/** 숫자 입력형 문제 */
export function numQ(
  b: QuestionBase,
  prompt: string,
  answer: number,
  unit: string,
  hint: string,
  explanation: string,
): Question {
  return { ...b, prompt, answer, unit, hint, explanation };
}

export function shuffle<T>(rng: Rng, arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 선택형 문제: 정답과 오답 후보를 섞어서 최대 4개 선택지를 만든다.
 * 오답 후보 중 정답과 같은 것, 중복은 빼고 최대 3개를 쓴다.
 */
export function choiceQ(
  rng: Rng,
  b: QuestionBase,
  prompt: string,
  correct: string,
  distractors: readonly string[],
  hint: string,
  explanation: string,
  unit = "",
): Question {
  const unique = [...new Set(distractors)].filter(d => d !== correct);
  const picked = shuffle(rng, unique).slice(0, 3);
  const choices = shuffle(rng, [correct, ...picked]);
  return { ...b, prompt, choices, answer: choices.indexOf(correct), unit, hint, explanation };
}

/** 정답 판정 (선택형은 1부터 시작하는 번호를 입력으로 받는다) */
export function checkQuestionAnswer(q: Question, input: string): boolean {
  const t = input.trim();
  if (!/^\d+$/.test(t)) {
    return false;
  }
  return q.choices ? Number(t) - 1 === q.answer : Number(t) === q.answer;
}

/** 정답을 사람이 읽는 글자로 */
export function answerText(q: Question): string {
  return q.choices ? `${q.answer + 1}번 ${q.choices[q.answer]}` : `${q.answer}${q.unit}`;
}

/** 학년·학기를 0~11 로 (1-1 → 0, 6-2 → 11) */
export function termIndex(grade: number, semester: number): number {
  return (grade - 1) * 2 + (semester - 1);
}

export function termLabel(index: number): string {
  return `${Math.floor(index / 2) + 1}학년 ${(index % 2) + 1}학기`;
}
