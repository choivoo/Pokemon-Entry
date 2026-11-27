import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { generateProblem, type MathProblem } from "#app/math/math-problems";

/** 오답 몇 번이면 문제를 바꿔 주는지 */
const MAX_MISSES_BEFORE_NEW_PROBLEM = 3;

const OVERLAY_ID = "math-gate-overlay";

const STYLE = `
#${OVERLAY_ID}{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;
background:rgba(10,12,30,.82);font-family:"Noto Sans KR","Malgun Gothic",sans-serif;color:#fff}
#${OVERLAY_ID} .mg-card{width:min(92vw,520px);background:#1d2340;border:4px solid #f8d030;border-radius:14px;
padding:18px 18px 16px;box-shadow:0 8px 40px #000a;text-align:center}
#${OVERLAY_ID} h2{margin:0 0 4px;font-size:20px;color:#f8d030}
#${OVERLAY_ID} .mg-sub{font-size:13px;color:#9fb0ff;margin-bottom:10px}
#${OVERLAY_ID} .mg-q{white-space:pre-line;font-size:19px;line-height:1.55;background:#11162d;border-radius:10px;padding:14px 10px;margin-bottom:10px}
#${OVERLAY_ID} .mg-display{font-size:30px;font-weight:700;min-height:44px;line-height:44px;background:#fff;color:#111;border-radius:8px;margin-bottom:8px}
#${OVERLAY_ID} .mg-msg{min-height:44px;font-size:14px;white-space:pre-line;margin-bottom:8px}
#${OVERLAY_ID} .mg-msg.bad{color:#ff8080}#${OVERLAY_ID} .mg-msg.good{color:#80ff9c}
#${OVERLAY_ID} .mg-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px}
#${OVERLAY_ID} button{font:inherit;font-size:20px;padding:10px 0;border:0;border-radius:8px;background:#3b4a8f;color:#fff;cursor:pointer}
#${OVERLAY_ID} button:active{background:#5566bb}
#${OVERLAY_ID} .mg-row{display:flex;gap:6px}#${OVERLAY_ID} .mg-row button{flex:1;font-size:16px}
#${OVERLAY_ID} .mg-ok{background:#2a9d4a!important}#${OVERLAY_ID} .mg-hint{background:#8a6d1f!important}
`;

/**
 * 층 사이의 "수학 관문".
 * 비례식/비례배분 문제를 풀어야 다음 층이 열린다.
 * 정답 → 다음 층 개방 → (기존 흐름) 아이템 선택 → 다음 포켓몬 전투
 */
export class MathGatePhase extends Phase {
  public readonly phaseName = "MathGatePhase";

  private problem!: MathProblem;
  private input = "";
  private misses = 0;
  private totalMisses = 0;
  private hintUsed = false;
  private lastKind: MathProblem["kind"] | undefined;
  private overlay: HTMLElement | undefined;
  private keyHandler?: (e: KeyboardEvent) => void;

  public override start(): void {
    super.start();
    // DOM 이 없거나 자동화 테스트 환경에서는 문제를 건너뛴다.
    if (typeof document === "undefined" || import.meta.env.MODE === "test") {
      this.end();
      return;
    }
    this.nextProblem();
    this.buildOverlay();
  }

  private get wave(): number {
    return globalScene.currentBattle?.waveIndex ?? 1;
  }

  private nextProblem(): void {
    this.problem = generateProblem(this.wave, Math.random, this.lastKind);
    this.lastKind = this.problem.kind;
    this.input = "";
    this.misses = 0;
  }

  private buildOverlay(): void {
    document.getElementById(OVERLAY_ID)?.remove();
    const root = document.createElement("div");
    root.id = OVERLAY_ID;
    root.innerHTML = `
      <style>${STYLE}</style>
      <div class="mg-card">
        <h2>🔒 ${this.wave + 1}층으로 가는 문</h2>
        <div class="mg-sub">문제를 풀면 다음 층이 열려요!</div>
        <div class="mg-q"></div>
        <div class="mg-display"></div>
        <div class="mg-msg"></div>
        <div class="mg-pad"></div>
        <div class="mg-row"></div>
      </div>`;
    document.body.appendChild(root);
    this.overlay = root;

    const pad = root.querySelector(".mg-pad") as HTMLElement;
    for (const label of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "C"]) {
      pad.appendChild(this.makeButton(label, () => this.press(label)));
    }
    const row = root.querySelector(".mg-row") as HTMLElement;
    const hint = this.makeButton("💡 힌트", () => this.showHint());
    hint.classList.add("mg-hint");
    const ok = this.makeButton("확인 ✔", () => this.submit());
    ok.classList.add("mg-ok");
    row.append(hint, ok);

    this.keyHandler = (e: KeyboardEvent) => {
      // 게임(Phaser)이 키 입력을 가로채지 못하도록 막는다.
      e.stopPropagation();
      e.preventDefault();
      if (/^[0-9]$/.test(e.key)) {
        this.press(e.key);
      } else if (e.key === "Backspace") {
        this.press("⌫");
      } else if (e.key === "Enter") {
        this.submit();
      }
    };
    window.addEventListener("keydown", this.keyHandler, true);
    window.addEventListener("keyup", this.swallow, true);
    this.render();
  }

  private readonly swallow = (e: KeyboardEvent): void => {
    e.stopPropagation();
  };

  private makeButton(label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  private q(sel: string): HTMLElement {
    return this.overlay!.querySelector(sel) as HTMLElement;
  }

  private render(): void {
    this.q(".mg-q").textContent = this.problem.question;
    this.q(".mg-display").textContent = this.input === "" ? "?" : `${this.input}${this.problem.unit}`;
  }

  private setMsg(text: string, cls: "" | "good" | "bad" = ""): void {
    const m = this.q(".mg-msg");
    m.textContent = text;
    m.className = `mg-msg ${cls}`;
  }

  private press(label: string): void {
    if (label === "⌫") {
      this.input = this.input.slice(0, -1);
    } else if (label === "C") {
      this.input = "";
    } else if (this.input.length < 6) {
      this.input = (this.input + label).replace(/^0+(?=\d)/, "");
    }
    this.render();
  }

  private showHint(): void {
    this.hintUsed = true;
    this.setMsg(`💡 ${this.problem.hint}`);
  }

  private submit(): void {
    if (this.input === "") {
      this.setMsg("답을 먼저 입력하세요!", "bad");
      return;
    }
    if (Number(this.input) === this.problem.answer) {
      this.onCorrect();
      return;
    }
    this.misses++;
    this.totalMisses++;
    this.input = "";
    if (this.misses >= MAX_MISSES_BEFORE_NEW_PROBLEM) {
      const explanation = this.problem.explanation;
      this.nextProblem();
      this.setMsg(`풀이를 확인하고 새 문제에 도전하세요!\n${explanation}`, "bad");
    } else {
      this.setMsg(`앗, 틀렸어요! (${this.misses}/${MAX_MISSES_BEFORE_NEW_PROBLEM}) 힌트 버튼을 눌러 보세요.`, "bad");
    }
    this.render();
  }

  private onCorrect(): void {
    // 한 번에 맞히고 힌트도 안 썼다면 보너스 머니
    let bonus = 0;
    if (this.totalMisses === 0 && !this.hintUsed) {
      bonus = Math.max(50, this.wave * 10);
      globalScene.addMoney(bonus);
    }
    this.setMsg(
      `정답! ${this.wave + 1}층이 열렸어요! 🎉${bonus ? `\n한 번에 성공! 보너스 ₽${bonus}` : ""}`,
      "good",
    );
    for (const b of Array.from(this.overlay!.querySelectorAll("button"))) {
      (b as HTMLButtonElement).disabled = true;
    }
    setTimeout(() => this.close(), 1100);
  }

  private close(): void {
    if (this.keyHandler) {
      window.removeEventListener("keydown", this.keyHandler, true);
    }
    window.removeEventListener("keyup", this.swallow, true);
    this.overlay?.remove();
    this.overlay = undefined;
    this.end();
  }
}
