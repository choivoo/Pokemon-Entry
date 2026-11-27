/**
 * 수학 관문 화면 (게임 캔버스 위에 뜨는 HTML 창).
 * 게임 폰트(emerald)와 포켓몬 에메랄드풍 창 디자인을 사용하고, 키보드·마우스·터치를 모두 지원한다.
 */
import type { DifficultyRule } from "#app/edu/difficulty";
import { checkQuestionAnswer, type Question } from "#app/edu/question";
import { ratioToQuestion } from "#app/edu/select";
import { generateProblem, type MathProblemKind } from "#app/math/math-problems";
import { type MathLang, ui } from "#app/math/math-text";

/** 오답 몇 번이면 풀이를 보여주고 문제를 바꾸는지 */
export const MAX_MISSES = 3;

export const OVERLAY_ID = "math-gate-overlay";

export interface MathGateOptions {
  /** 방금 클리어한 웨이브 */
  wave: number;
  lang: MathLang;
  /** 문제에 등장시킬 포켓몬 이름 (파티) */
  names: string[];
  /** 지금까지 연속 정답 수 (첫 시도 정답 기준) */
  streak: number;
  /** 한 번에 맞혔을 때 줄 보너스 금액 */
  bonus: number;
  /** 문제를 만드는 함수 (없으면 비례식·비례배분 문제). `exclude`는 직전 문제 유형 */
  question?: (exclude?: string) => Question;
  /** 난이도 규칙 (오답 허용 횟수, 힌트 횟수, 제한 시간) */
  rule?: DifficultyRule;
  /** 정답을 맞혔을 때 받는 점수 (화면에 "+N점"으로 보여 준다) */
  scoreFor?: (info: { level: number; perfect: boolean }) => number;
  /** 효과음 재생 */
  playSound?: (key: "select" | "error" | "correct" | "open") => void;
  /** 테스트용 난수 */
  rng?: () => number;
}

export interface MathGateResult {
  /** 푼 문제의 수준(1~4)과 유형 */
  level: number;
  kind: string;
  /** 시간 초과 횟수 */
  timeouts: number;
  /** 힌트 없이 한 번에 맞혔는지 */
  perfect: boolean;
  /** 전체 오답 수 */
  misses: number;
  /** 사용한 힌트 수 */
  hints: number;
}

const CSS = `
#${OVERLAY_ID}{--s:min(1px,0.112vh,0.15vw);--f:1;position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(ellipse at center,rgba(24,28,56,.72),rgba(6,6,16,.9));
  font-family:emerald,pkmnems,"Noto Sans KR","Malgun Gothic",sans-serif;color:#f8f8f8;line-height:1;
  -webkit-user-select:none;user-select:none;touch-action:manipulation;animation:mg-fade .25s ease-out}
#${OVERLAY_ID} *{box-sizing:border-box}
#${OVERLAY_ID} .sym{font-family:"Noto Sans KR","Malgun Gothic",sans-serif;font-size:.8em}
#${OVERLAY_ID} .mg-card{position:relative;width:calc(640 * var(--s));max-width:96vw;
  background:#283048;border:calc(5 * var(--s)) solid #f8f8f8;border-radius:calc(12 * var(--s));
  box-shadow:0 0 0 calc(5 * var(--s)) #303040,0 0 0 calc(10 * var(--s)) #707890,0 calc(16 * var(--s)) calc(60 * var(--s)) #000c;
  padding:calc(16 * var(--s)) calc(20 * var(--s));animation:mg-pop .35s cubic-bezier(.2,1.4,.4,1)}
#${OVERLAY_ID} .mg-head{display:flex;align-items:center;gap:calc(12 * var(--s))}
#${OVERLAY_ID} .mg-lock{width:calc(56 * var(--s));height:calc(56 * var(--s));flex:none;display:grid;place-items:center;font-size:calc(32 * var(--s) * var(--f));
  background:#f8d030;border:calc(4 * var(--s)) solid #a07808;border-radius:calc(10 * var(--s))}
#${OVERLAY_ID} .mg-headtext{flex:1;min-width:0}
#${OVERLAY_ID} .mg-title{font-size:calc(52 * var(--s) * var(--f));color:#f8d030;text-shadow:calc(3 * var(--s)) calc(3 * var(--s)) 0 #685010}
#${OVERLAY_ID} .mg-sub{font-size:calc(28 * var(--s) * var(--f));color:#b8c8f8;margin-top:calc(4 * var(--s))}
#${OVERLAY_ID} .mg-tags{display:flex;flex-wrap:wrap;justify-content:flex-end;margin-top:calc(8 * var(--s));gap:calc(4 * var(--s));font-size:calc(30 * var(--s) * var(--f))}
#${OVERLAY_ID} .mg-tag{background:#404868;border-radius:calc(6 * var(--s));padding:calc(3 * var(--s)) calc(10 * var(--s));white-space:nowrap}
#${OVERLAY_ID} .mg-tag .star{color:#f8d030}
#${OVERLAY_ID} .mg-tag.streak{background:#b04818}
#${OVERLAY_ID} .mg-tag.cat{background:#2a7a58}
#${OVERLAY_ID} .mg-q.long{font-size:calc(34 * var(--s) * var(--f))}
#${OVERLAY_ID} .mg-q{white-space:pre-line;font-size:calc(42 * var(--s) * var(--f));line-height:1.15;color:#303030;background:#f8f8f8;
  border:calc(5 * var(--s)) solid #d8a848;border-radius:calc(10 * var(--s));padding:calc(12 * var(--s));margin:calc(8 * var(--s)) 0 calc(10 * var(--s));
  min-height:calc(150 * var(--s));display:flex;align-items:center;justify-content:center;text-align:center;
  text-shadow:calc(2 * var(--s)) calc(2 * var(--s)) 0 #d0d0c8}
#${OVERLAY_ID} .box{display:inline-block;min-width:1.1em;height:1em;border:calc(4 * var(--s)) solid #e05030;border-radius:calc(4 * var(--s));
  vertical-align:-.12em;background:#fff0e8;color:#303030;animation:mg-pulse 1.2s ease-in-out infinite}
#${OVERLAY_ID} .mg-display{font-size:calc(60 * var(--s) * var(--f));height:calc(78 * var(--s) * var(--f));display:flex;align-items:center;justify-content:center;
  background:#101828;color:#f8f8f8;border:calc(4 * var(--s)) solid #6878a8;border-radius:calc(10 * var(--s));letter-spacing:calc(3 * var(--s))}
#${OVERLAY_ID} .mg-display .ph{color:#5868a0}
#${OVERLAY_ID} .mg-display .cursor{display:inline-block;width:calc(5 * var(--s));height:calc(48 * var(--s));background:#f8d030;margin-left:calc(4 * var(--s));animation:mg-blink 1s steps(1) infinite}
#${OVERLAY_ID} .mg-msg{min-height:calc(76 * var(--s));font-size:calc(32 * var(--s) * var(--f));line-height:1.15;white-space:pre-line;
  padding:calc(6 * var(--s)) calc(12 * var(--s));margin:calc(10 * var(--s)) 0;border-radius:calc(8 * var(--s));display:flex;align-items:center}
#${OVERLAY_ID} .mg-msg.bad{color:#ffc0b8;background:#682828}
#${OVERLAY_ID} .mg-msg.good{color:#c0ffc8;background:#286830}
#${OVERLAY_ID} .mg-msg.hint{color:#fff0b0;background:#685818}
#${OVERLAY_ID} .mg-pad{display:grid;grid-template-columns:repeat(6,1fr);gap:calc(8 * var(--s))}
#${OVERLAY_ID} button{font-family:inherit;font-size:calc(44 * var(--s) * var(--f));height:calc(66 * var(--s) * var(--f));border:0;border-radius:calc(10 * var(--s));
  cursor:pointer;color:#f8f8f8;background:#4858a0;box-shadow:inset 0 calc(-6 * var(--s)) 0 #283070;
  text-shadow:calc(2 * var(--s)) calc(2 * var(--s)) 0 #20284880;transition:transform .05s}
#${OVERLAY_ID} button:hover{filter:brightness(1.15)}
#${OVERLAY_ID} button:active,#${OVERLAY_ID} button.pressed{transform:translateY(calc(3 * var(--s)));box-shadow:inset 0 calc(-3 * var(--s)) 0 #283070}
#${OVERLAY_ID} button:disabled{opacity:.5;cursor:default}
#${OVERLAY_ID} .mg-del{background:#806070;box-shadow:inset 0 calc(-6 * var(--s)) 0 #503040}
#${OVERLAY_ID} .mg-hint{grid-column:span 3;background:#b08820;box-shadow:inset 0 calc(-6 * var(--s)) 0 #705010;font-size:calc(38 * var(--s) * var(--f))}
#${OVERLAY_ID} .mg-ok{grid-column:span 3;background:#38a048;box-shadow:inset 0 calc(-6 * var(--s)) 0 #206028;font-size:calc(38 * var(--s) * var(--f))}
#${OVERLAY_ID} .mg-keys{font-size:calc(26 * var(--s) * var(--f));color:#8898c8;text-align:center;margin-top:calc(10 * var(--s))}
#${OVERLAY_ID}.shake .mg-card{animation:mg-shake .4s}
#${OVERLAY_ID}.solved .mg-lock{background:#58d068;border-color:#208030;animation:mg-spin .6s}
#${OVERLAY_ID}.closing{animation:mg-out .45s forwards}
#${OVERLAY_ID} .mg-burst{position:absolute;left:50%;top:45%;pointer-events:none}
#${OVERLAY_ID} .mg-burst i{position:absolute;width:calc(14 * var(--s));height:calc(14 * var(--s));border-radius:calc(3 * var(--s));animation:mg-burst .9s ease-out forwards}
@keyframes mg-fade{from{opacity:0}}
@keyframes mg-pop{from{transform:scale(.7);opacity:0}}
@keyframes mg-out{to{opacity:0;transform:scale(1.08)}}
@keyframes mg-blink{50%{opacity:0}}
@keyframes mg-pulse{50%{background:#ffd0c0}}
@keyframes mg-spin{50%{transform:scale(1.3) rotate(-12deg)}}
@keyframes mg-shake{20%{transform:translateX(-12px)}40%{transform:translateX(12px)}60%{transform:translateX(-7px)}80%{transform:translateX(7px)}}
@keyframes mg-burst{to{transform:translate(var(--x),var(--y)) rotate(540deg);opacity:0}}
#${OVERLAY_ID} .mg-timer{position:relative;height:calc(18 * var(--s));margin:calc(2 * var(--s)) 0 calc(8 * var(--s));background:#101828;border:calc(3 * var(--s)) solid #6878a8;border-radius:calc(9 * var(--s));overflow:hidden}
#${OVERLAY_ID} .mg-timer i{position:absolute;inset:0 auto 0 0;width:100%;background:linear-gradient(90deg,#58d068,#f8d030);transition:width .2s linear}
#${OVERLAY_ID} .mg-timer.low i{background:linear-gradient(90deg,#f05868,#f8a038)}
#${OVERLAY_ID} .mg-timer span{position:absolute;inset:0;display:grid;place-items:center;font-size:calc(18 * var(--s) * var(--f));color:#fff;text-shadow:0 0 calc(4 * var(--s)) #000}
#${OVERLAY_ID} .mg-choices{display:grid;grid-template-columns:1fr;gap:calc(8 * var(--s))}
#${OVERLAY_ID} .mg-choices.two{grid-template-columns:1fr 1fr}
#${OVERLAY_ID} .mg-choice{display:flex;align-items:center;gap:calc(10 * var(--s));text-align:left;padding:0 calc(14 * var(--s));height:auto;min-height:calc(66 * var(--s));font-size:calc(36 * var(--s) * var(--f));line-height:1.1;word-break:keep-all}
#${OVERLAY_ID} .mg-choice b{flex:none;display:grid;place-items:center;width:calc(40 * var(--s));height:calc(40 * var(--s));border-radius:50%;background:#f8f8f8;color:#283070;font-size:calc(28 * var(--s) * var(--f))}
#${OVERLAY_ID} .mg-choice.wrong{background:#a04048;box-shadow:inset 0 calc(-6 * var(--s)) 0 #602028;opacity:.7}
#${OVERLAY_ID} .mg-choice.right{background:#38a048;box-shadow:inset 0 calc(-6 * var(--s)) 0 #206028}
#${OVERLAY_ID} .mg-rowbtn{display:flex;gap:calc(8 * var(--s));margin-top:calc(8 * var(--s))}
#${OVERLAY_ID} .mg-rowbtn button{flex:1}
#${OVERLAY_ID} .hidden{display:none!important}
@media (orientation:portrait){#${OVERLAY_ID}{--s:min(1px,0.15vw);--f:1.5}#${OVERLAY_ID} .mg-sub,#${OVERLAY_ID} .mg-keys{display:none}}
`;

const MAX_DIGITS = 6;

/** 현재 열려 있는 관문 정리 함수 (중복으로 열리는 것을 막는다) */
let activeCleanup: (() => void) | undefined;

/**
 * 관문을 띄우고, 정답을 맞혀 문이 열리면 resolve 된다.
 * 숫자를 입력하는 문제와 번호를 고르는(선택형) 문제를 모두 지원한다.
 */
export function showMathGate(opts: MathGateOptions): Promise<MathGateResult> {
  return new Promise(resolve => {
    const { wave, lang, rule } = opts;
    const floor = wave + 1;
    const rng = opts.rng ?? Math.random;
    const sound = opts.playSound ?? (() => {});
    const maxMisses = rule?.maxMisses ?? MAX_MISSES;
    const hintLimit = rule ? rule.hints : null;
    const timeLimit = rule?.timeLimit ?? null;

    const source =
      opts.question
      ?? ((exclude?: string) =>
        ratioToQuestion(generateProblem(wave, rng, exclude as MathProblemKind | undefined), lang, opts.names));

    let problem!: Question;
    let lastKind: string | undefined;
    let input = "";
    let misses = 0;
    let totalMisses = 0;
    let timeouts = 0;
    let hints = 0;
    let hintsThisProblem = 0;
    let done = false;
    let deadline = 0;
    let timerId: ReturnType<typeof setInterval> | undefined;

    activeCleanup?.();
    document.getElementById(OVERLAY_ID)?.remove();
    const root = document.createElement("div");
    root.id = OVERLAY_ID;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.innerHTML = `
      <style>${CSS}</style>
      <div class="mg-card">
        <div class="mg-head">
          <div class="mg-lock" aria-hidden="true">🔒</div>
          <div class="mg-headtext"><div class="mg-title"></div><div class="mg-sub"></div></div>
        </div>
        <div class="mg-tags"></div>
        <div class="mg-timer hidden"><i></i><span></span></div>
        <div class="mg-q" aria-live="polite"></div>
        <div class="mg-choices hidden"></div>
        <div class="mg-display"></div>
        <div class="mg-msg" aria-live="assertive"></div>
        <div class="mg-pad"></div>
        <div class="mg-rowbtn hidden"></div>
        <div class="mg-keys"></div>
      </div>`;
    document.body.appendChild(root);

    const $ = (sel: string) => root.querySelector(sel) as HTMLElement;
    $(".mg-title").textContent = ui(lang, "title", { floor });
    $(".mg-sub").textContent = ui(lang, "subtitle");

    const pad = $(".mg-pad");
    const buttons = new Map<string, HTMLButtonElement>();
    const makeButton = (key: string, label: string, cls = ""): HTMLButtonElement => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.className = cls;
      b.dataset.key = key;
      b.addEventListener("click", () => handle(key));
      buttons.set(key, b);
      return b;
    };
    for (const d of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]) {
      pad.appendChild(makeButton(d, d));
    }
    pad.appendChild(makeButton("back", "←", "mg-del"));
    pad.appendChild(makeButton("clear", "C", "mg-del"));
    const hintBtn = makeButton("hint", "", "mg-hint");
    pad.appendChild(hintBtn);
    pad.appendChild(makeButton("ok", `${ui(lang, "confirm")} ✔`, "mg-ok"));
    // 선택형 문제에서는 힌트 버튼만 아래에 따로 둔다
    const rowBtn = $(".mg-rowbtn");

    const setMsg = (msg: string, cls: "" | "good" | "bad" | "hint" = "") => {
      const m = $(".mg-msg");
      m.replaceChildren(richText(msg));
      m.className = `mg-msg ${cls}`;
    };

    /** 글자를 넣되, □ 는 강조된 빈칸 상자로 바꾼다 (픽셀 폰트에 □ 글리프가 없음) */
    const richText = (str: string): HTMLElement => {
      const el = document.createElement("div");
      str.split("□").forEach((part, i) => {
        if (i > 0) {
          const box = document.createElement("span");
          box.className = "box";
          el.appendChild(box);
        }
        el.append(part);
      });
      return el;
    };

    const renderTags = () => {
      const tags = $(".mg-tags");
      tags.innerHTML = "";
      const cat = document.createElement("span");
      cat.className = "mg-tag cat";
      cat.textContent = problem.category;
      tags.appendChild(cat);
      const lv = document.createElement("span");
      lv.className = "mg-tag";
      lv.append(`${ui(lang, "level")} `);
      const stars = document.createElement("span");
      stars.className = "sym star";
      stars.textContent = "★".repeat(problem.level) + "☆".repeat(4 - problem.level);
      lv.appendChild(stars);
      tags.appendChild(lv);
      if (rule) {
        const d = document.createElement("span");
        d.className = "mg-tag";
        d.style.background = rule.color;
        d.style.color = "#101828";
        d.textContent = rule.name;
        tags.appendChild(d);
      }
      if (opts.streak > 0) {
        const st = document.createElement("span");
        st.className = "mg-tag streak";
        st.textContent = ui(lang, "streak", { n: opts.streak });
        tags.appendChild(st);
      }
    };

    const renderInput = () => {
      const d = $(".mg-display");
      d.innerHTML = "";
      if (input === "") {
        const ph = document.createElement("span");
        ph.className = "ph";
        ph.textContent = "?";
        d.appendChild(ph);
      } else {
        d.append(input + problem.unit);
      }
      const c = document.createElement("span");
      c.className = "cursor";
      d.appendChild(c);
    };

    const hintsLeft = () => (hintLimit === null ? Number.POSITIVE_INFINITY : hintLimit - hintsThisProblem);

    const renderHintButton = () => {
      const left = hintsLeft();
      const label = `💡 ${ui(lang, "hint")}${Number.isFinite(left) ? ` (${left})` : ""}`;
      hintBtn.textContent = label;
      hintBtn.disabled = left <= 0;
      hintBtn.classList.toggle("hidden", hintLimit === 0);
    };

    /** 이 문제가 선택형이면 true */
    const isChoice = () => !!problem.choices;

    const renderQuestion = () => {
      const q = $(".mg-q");
      q.classList.toggle("long", problem.prompt.split("\n").length > 4);
      q.replaceChildren(richText(problem.prompt));
      const box = $(".mg-choices");
      const choice = isChoice();
      box.classList.toggle("hidden", !choice);
      $(".mg-display").classList.toggle("hidden", choice);
      pad.classList.toggle("hidden", choice);
      rowBtn.classList.toggle("hidden", !choice || hintLimit === 0);
      $(".mg-keys").textContent = ui(lang, choice ? "keysChoice" : "keys");
      box.replaceChildren();
      if (choice) {
        const short = problem.choices!.every(c => c.length <= 6);
        box.classList.toggle("two", short);
        problem.choices!.forEach((c, i) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "mg-choice";
          b.dataset.key = `c${i + 1}`;
          const num = document.createElement("b");
          num.textContent = String(i + 1);
          num.className = "sym";
          const txt = document.createElement("span");
          txt.textContent = c;
          b.append(num, txt);
          b.addEventListener("click", () => handle(String(i + 1)));
          box.appendChild(b);
        });
        // 힌트 버튼을 선택지 아래로 옮긴다
        rowBtn.replaceChildren(hintBtn);
      } else {
        // 숫자 키패드 안의 원래 자리로
        pad.insertBefore(hintBtn, buttons.get("ok")!);
      }
    };

    // #region 제한 시간

    const stopTimer = () => {
      if (timerId !== undefined) {
        clearInterval(timerId);
        timerId = undefined;
      }
    };

    const tick = () => {
      const left = Math.max(0, deadline - Date.now());
      const bar = $(".mg-timer");
      (bar.querySelector("i") as HTMLElement).style.width = `${(left / ((timeLimit ?? 1) * 1000)) * 100}%`;
      (bar.querySelector("span") as HTMLElement).textContent = `${Math.ceil(left / 1000)}`;
      bar.classList.toggle("low", left < 10_000);
      if (left <= 0 && !done) {
        onTimeout();
      }
    };

    const startTimer = () => {
      stopTimer();
      if (!timeLimit) {
        return;
      }
      $(".mg-timer").classList.remove("hidden");
      deadline = Date.now() + timeLimit * 1000;
      tick();
      timerId = setInterval(tick, 200);
    };

    // #endregion

    const newProblem = () => {
      problem = source(lastKind);
      lastKind = problem.kind;
      input = "";
      misses = 0;
      hintsThisProblem = 0;
      renderQuestion();
      renderTags();
      renderInput();
      renderHintButton();
      startTimer();
    };

    const burst = () => {
      const b = document.createElement("div");
      b.className = "mg-burst";
      const colors = ["#f8d030", "#58d068", "#f87858", "#68a8f8", "#f8f8f8"];
      for (let i = 0; i < 28; i++) {
        const p = document.createElement("i");
        const ang = (i / 28) * Math.PI * 2;
        const dist = 120 + (i % 4) * 40;
        p.style.background = colors[i % colors.length];
        p.style.setProperty("--x", `${Math.cos(ang) * dist}px`);
        p.style.setProperty("--y", `${Math.sin(ang) * dist}px`);
        b.appendChild(p);
      }
      $(".mg-card").appendChild(b);
    };

    const flash = (key: string) => {
      const b = buttons.get(key);
      if (b) {
        b.classList.add("pressed");
        setTimeout(() => b.classList.remove("pressed"), 90);
      }
    };

    /** 오답(또는 시간 초과) 처리 */
    const miss = (reason: "wrong" | "timeout", choiceKey?: string) => {
      misses++;
      totalMisses++;
      if (reason === "timeout") {
        timeouts++;
      }
      input = "";
      sound("error");
      root.classList.remove("shake");
      root.getBoundingClientRect(); // 애니메이션 재시작
      root.classList.add("shake");
      if (misses >= maxMisses) {
        const explanation = problem.explanation;
        newProblem();
        setMsg(`${ui(lang, reason === "timeout" ? "timeoutNew" : "newProblem")}\n${explanation}`, "bad");
      } else {
        if (choiceKey) {
          const b = root.querySelector(`.mg-choice[data-key="${choiceKey}"]`) as HTMLButtonElement | null;
          b?.classList.add("wrong");
          if (b) {
            b.disabled = true;
          }
        }
        setMsg(ui(lang, reason === "timeout" ? "timeout" : "wrong", { n: misses, max: maxMisses }), "bad");
        renderInput();
        if (reason === "timeout") {
          startTimer();
        }
      }
    };

    function onTimeout() {
      miss("timeout");
    }

    const submit = (choiceKey?: string) => {
      if (input === "") {
        sound("error");
        setMsg(ui(lang, "needInput"), "bad");
        return;
      }
      if (checkQuestionAnswer(problem, input)) {
        done = true;
        stopTimer();
        const perfect = totalMisses === 0 && hints === 0;
        sound("correct");
        root.classList.add("solved");
        ($(".mg-lock") as HTMLElement).textContent = "🔓";
        if (choiceKey) {
          root.querySelector(`.mg-choice[data-key="${choiceKey}"]`)?.classList.add("right");
        }
        setMsg(
          ui(lang, "correct", { floor })
            + (perfect && opts.bonus > 0 ? `\n${ui(lang, "bonus", { bonus: opts.bonus })}` : "")
            + (opts.scoreFor ? ` ${ui(lang, "points", { n: opts.scoreFor({ level: problem.level, perfect }) })}` : ""),
          "good",
        );
        for (const b of [...buttons.values(), ...Array.from(root.querySelectorAll<HTMLButtonElement>(".mg-choice"))]) {
          b.disabled = true;
        }
        burst();
        const result: MathGateResult = {
          perfect,
          misses: totalMisses,
          hints,
          level: problem.level,
          kind: problem.kind,
          timeouts,
        };
        setTimeout(() => {
          sound("open");
          root.classList.add("closing");
          setTimeout(() => {
            cleanup();
            resolve(result);
          }, 450);
        }, 1300);
        return;
      }
      miss("wrong", choiceKey);
    };

    const useHint = () => {
      if (hintsLeft() <= 0) {
        sound("error");
        return;
      }
      hints++;
      hintsThisProblem++;
      sound("select");
      setMsg(`💡 ${problem.hint}`, "hint");
      renderHintButton();
    };

    const handle = (key: string) => {
      if (done) {
        return;
      }
      flash(key);
      if (key === "hint") {
        useHint();
        return;
      }
      if (isChoice()) {
        const n = Number(key);
        if (/^[1-9]$/.test(key) && n <= problem.choices!.length) {
          const btn = root.querySelector(`.mg-choice[data-key="c${n}"]`) as HTMLButtonElement | null;
          if (btn?.disabled) {
            return;
          }
          input = key;
          submit(`c${n}`);
        }
        return;
      }
      if (/^\d$/.test(key)) {
        if (input.length < MAX_DIGITS) {
          input = input === "0" ? key : input + key;
          sound("select");
        }
        renderInput();
      } else if (key === "back") {
        input = input.slice(0, -1);
        renderInput();
      } else if (key === "clear") {
        input = "";
        renderInput();
      } else if (key === "ok") {
        submit();
      }
    };

    // 게임(Phaser)이 키 입력을 가져가지 못하도록 캡처 단계에서 막는다.
    const onKeyDown = (e: KeyboardEvent) => {
      if (!root.isConnected) {
        // 화면이 이미 사라졌으면 남은 키 입력 가로채기를 풀어 준다
        cleanup();
        return;
      }
      e.stopImmediatePropagation();
      e.preventDefault();
      if (e.repeat && !/^\d$/.test(e.key)) {
        return;
      }
      const k = e.key;
      if (/^\d$/.test(k)) {
        handle(k);
      } else if (k === "Backspace" || k === "Delete") {
        handle("back");
      } else if (k === "Escape") {
        handle("clear");
      } else if (k === "Enter" || k === " " || k.toLowerCase() === "z") {
        handle("ok");
      } else if (k.toLowerCase() === "h") {
        handle("hint");
      }
    };
    const swallow = (e: Event) => e.stopImmediatePropagation();
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", swallow, true);

    const cleanup = () => {
      stopTimer();
      if (activeCleanup === cleanup) {
        activeCleanup = undefined;
      }
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", swallow, true);
      root.remove();
    };

    activeCleanup = cleanup;
    newProblem();
  });
}
