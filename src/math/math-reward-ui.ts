/**
 * 수학 관문 보상 화면: 룰렛 / 보물 상자 / 보상 고르기.
 * 관문 화면과 같은 디자인(게임 픽셀 폰트, 에메랄드풍 창)이고 키보드·마우스·터치를 모두 지원한다.
 */
import { type MathLang, ui } from "#app/math/math-text";

export const REWARD_OVERLAY_ID = "math-reward-overlay";

export type RewardMode = "roulette" | "jackpot" | "box" | "choice";

export interface RewardCard {
  name: string;
  description: string;
  /** 아이콘 이미지 주소 */
  icon: string;
  /** 0 일반 ~ 4 마스터 */
  rarity: number;
}

export interface RewardScreenOptions {
  mode: RewardMode;
  cards: RewardCard[];
  lang: MathLang;
  playSound?: (key: "select" | "spin" | "tick" | "win" | "open") => void;
  rng?: () => number;
  /** 룰렛 회전 시간(ms) — 테스트에서 줄인다 */
  spinMs?: number;
}

/** 등급 색 (원본 아이템 등급 색과 같은 느낌) */
export const RARITY_COLORS = ["#e8e8e8", "#58a8f8", "#f8d038", "#f05868", "#c878f8"];

const CSS = `
#${REWARD_OVERLAY_ID}{--s:min(1px,0.118vh,0.15vw);--f:1;position:fixed;inset:0;z-index:2147483001;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(ellipse at center,rgba(40,28,64,.78),rgba(6,6,16,.92));
  font-family:emerald,pkmnems,"Noto Sans KR","Malgun Gothic",sans-serif;color:#f8f8f8;line-height:1.05;
  -webkit-user-select:none;user-select:none;touch-action:manipulation;animation:mr-fade .25s ease-out}
#${REWARD_OVERLAY_ID} *{box-sizing:border-box}
#${REWARD_OVERLAY_ID} .mr-card{position:relative;width:calc(700 * var(--s));max-width:96vw;background:#30284c;
  border:calc(5 * var(--s)) solid #f8f8f8;border-radius:calc(12 * var(--s));
  box-shadow:0 0 0 calc(5 * var(--s)) #303040,0 0 0 calc(10 * var(--s)) #8870b0,0 calc(16 * var(--s)) calc(60 * var(--s)) #000c;
  padding:calc(16 * var(--s)) calc(20 * var(--s));animation:mr-pop .35s cubic-bezier(.2,1.4,.4,1);text-align:center}
#${REWARD_OVERLAY_ID} .mr-title{font-size:calc(52 * var(--s) * var(--f));color:#f8d030;text-shadow:calc(3 * var(--s)) calc(3 * var(--s)) 0 #685010}
#${REWARD_OVERLAY_ID} .mr-sub{font-size:calc(30 * var(--s) * var(--f));color:#d0c0f8;margin:calc(6 * var(--s)) 0 calc(12 * var(--s))}
#${REWARD_OVERLAY_ID} .mr-stage{position:relative;display:flex;justify-content:center;align-items:center;gap:calc(14 * var(--s));min-height:calc(300 * var(--s))}
#${REWARD_OVERLAY_ID} .mr-item{position:relative;flex:1;max-width:calc(200 * var(--s));min-height:calc(270 * var(--s));background:#201a34;
  border:calc(5 * var(--s)) solid var(--c);border-radius:calc(12 * var(--s));padding:calc(10 * var(--s));cursor:pointer;
  display:flex;flex-direction:column;align-items:center;gap:calc(6 * var(--s));transition:transform .12s, box-shadow .12s}
#${REWARD_OVERLAY_ID} .mr-item.sel{transform:translateY(calc(-10 * var(--s))) scale(1.04);box-shadow:0 0 calc(24 * var(--s)) var(--c)}
#${REWARD_OVERLAY_ID} .mr-item.dim{opacity:.45;transform:scale(.94)}
#${REWARD_OVERLAY_ID} .mr-icon{width:calc(96 * var(--s));height:calc(96 * var(--s));image-rendering:pixelated;object-fit:contain;
  filter:drop-shadow(0 calc(4 * var(--s)) 0 #0006)}
#${REWARD_OVERLAY_ID} .mr-rar{font-size:calc(24 * var(--s) * var(--f));color:#201a34;background:var(--c);border-radius:calc(6 * var(--s));padding:calc(2 * var(--s)) calc(10 * var(--s))}
#${REWARD_OVERLAY_ID} .mr-name{font-size:calc(32 * var(--s) * var(--f));color:#f8f8f8;word-break:keep-all}
#${REWARD_OVERLAY_ID} .mr-desc{font-size:calc(22 * var(--s) * var(--f));color:#b8b0d8;word-break:keep-all;line-height:1.15}
#${REWARD_OVERLAY_ID} .mr-chest{font-size:calc(120 * var(--s));line-height:1;margin-top:calc(40 * var(--s));transition:transform .2s}
#${REWARD_OVERLAY_ID} .mr-item.closed{--c:#a08048;background:#2c2238}
#${REWARD_OVERLAY_ID} .mr-item.closed.sel .mr-chest{animation:mr-wiggle .6s ease-in-out infinite}
#${REWARD_OVERLAY_ID} .mr-item.revealed{animation:mr-flip .45s ease-out}
#${REWARD_OVERLAY_ID} .mr-wheelbox{position:relative;width:calc(420 * var(--s));height:calc(420 * var(--s))}
#${REWARD_OVERLAY_ID} .mr-wheel{position:absolute;inset:0;border-radius:50%;border:calc(8 * var(--s)) solid #f8f8f8;
  box-shadow:0 0 0 calc(6 * var(--s)) #303040,inset 0 0 calc(30 * var(--s)) #0008}
#${REWARD_OVERLAY_ID} .mr-slot{position:absolute;left:50%;top:50%;width:0;height:0}
#${REWARD_OVERLAY_ID} .mr-slot img{position:absolute;width:calc(84 * var(--s));height:calc(84 * var(--s));left:calc(-42 * var(--s));top:calc(-180 * var(--s));
  image-rendering:pixelated;filter:drop-shadow(0 calc(3 * var(--s)) 0 #0008)}
#${REWARD_OVERLAY_ID} .mr-hub{position:absolute;left:50%;top:50%;width:calc(90 * var(--s));height:calc(90 * var(--s));margin:calc(-45 * var(--s));
  border-radius:50%;background:#f8f8f8;border:calc(8 * var(--s)) solid #303040;display:grid;place-items:center;font-size:calc(40 * var(--s));color:#e04038}
#${REWARD_OVERLAY_ID} .mr-pointer{position:absolute;left:50%;top:calc(-14 * var(--s));margin-left:calc(-20 * var(--s));width:0;height:0;
  border-left:calc(20 * var(--s)) solid transparent;border-right:calc(20 * var(--s)) solid transparent;border-top:calc(40 * var(--s)) solid #f8d030;
  filter:drop-shadow(0 calc(3 * var(--s)) 0 #0008);z-index:2}
#${REWARD_OVERLAY_ID} .mr-result{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#100c20c0;border-radius:calc(10 * var(--s));animation:mr-fade .3s}
#${REWARD_OVERLAY_ID} .mr-result .mr-item{max-width:calc(320 * var(--s));min-height:0;cursor:default;animation:mr-pop .4s cubic-bezier(.2,1.4,.4,1)}
#${REWARD_OVERLAY_ID} .mr-result .mr-icon{width:calc(128 * var(--s));height:calc(128 * var(--s))}
#${REWARD_OVERLAY_ID} .mr-btn{font-family:inherit;font-size:calc(40 * var(--s) * var(--f));min-width:calc(260 * var(--s));height:calc(70 * var(--s) * var(--f));margin-top:calc(14 * var(--s));
  border:0;border-radius:calc(10 * var(--s));cursor:pointer;color:#f8f8f8;background:#38a048;box-shadow:inset 0 calc(-6 * var(--s)) 0 #206028}
#${REWARD_OVERLAY_ID} .mr-btn:active{transform:translateY(calc(3 * var(--s)))}
#${REWARD_OVERLAY_ID} .mr-btn:disabled{opacity:.5;cursor:default}
#${REWARD_OVERLAY_ID} .sym{font-family:"Noto Sans KR","Malgun Gothic",sans-serif}
#${REWARD_OVERLAY_ID} .mr-keys{font-size:calc(24 * var(--s) * var(--f));color:#9888c8;margin-top:calc(10 * var(--s))}
#${REWARD_OVERLAY_ID}.closing{animation:mr-out .35s forwards}
@keyframes mr-fade{from{opacity:0}}
@keyframes mr-pop{from{transform:scale(.7);opacity:0}}
@keyframes mr-out{to{opacity:0;transform:scale(1.06)}}
@keyframes mr-wiggle{25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}
@keyframes mr-flip{from{transform:rotateY(90deg)}}
@media (orientation:portrait){#${REWARD_OVERLAY_ID}{--s:min(1px,0.135vw);--f:1.5}
  #${REWARD_OVERLAY_ID} .mr-desc{display:none}}
`;

let activeCleanup: (() => void) | undefined;

/**
 * 보상 화면을 띄운다.
 * @returns 받게 된 보상의 번호 (`cards` 안의 위치)
 */
export function showRewardScreen(opts: RewardScreenOptions): Promise<number> {
  return new Promise(resolve => {
    const { mode, cards, lang } = opts;
    const rng = opts.rng ?? Math.random;
    const sound = opts.playSound ?? (() => {});
    const spinMs = opts.spinMs ?? 3600;

    activeCleanup?.();
    document.getElementById(REWARD_OVERLAY_ID)?.remove();
    const root = document.createElement("div");
    root.id = REWARD_OVERLAY_ID;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.innerHTML = `<style>${CSS}</style>
      <div class="mr-card">
        <div class="mr-title"></div><div class="mr-sub"></div>
        <div class="mr-stage"></div>
        <button type="button" class="mr-btn"></button>
        <div class="mr-keys"></div>
      </div>`;
    document.body.appendChild(root);
    const $ = (sel: string) => root.querySelector(sel) as HTMLElement;
    const stage = $(".mr-stage");
    const btn = $(".mr-btn") as HTMLButtonElement;

    const titleKey =
      mode === "choice" ? "choice" : mode === "box" ? "box" : mode === "jackpot" ? "jackpot" : "roulette";
    $(".mr-title").textContent = ui(lang, `${titleKey}Title`);
    $(".mr-sub").textContent = ui(lang, `${titleKey}Sub`);
    $(".mr-keys").textContent = ui(lang, "rewardKeys");

    const cardEl = (card: RewardCard): HTMLElement => {
      const el = document.createElement("div");
      el.className = "mr-item";
      el.style.setProperty("--c", RARITY_COLORS[card.rarity] ?? RARITY_COLORS[0]);
      const img = document.createElement("img");
      img.className = "mr-icon";
      img.src = card.icon;
      img.alt = "";
      const rar = document.createElement("div");
      rar.className = "mr-rar";
      rar.textContent = ui(lang, `rarity${card.rarity}`);
      const name = document.createElement("div");
      name.className = "mr-name";
      name.textContent = card.name;
      const desc = document.createElement("div");
      desc.className = "mr-desc";
      desc.textContent = card.description;
      el.append(img, rar, name, desc);
      return el;
    };

    let done = false;
    const finish = (index: number) => {
      if (done) {
        return;
      }
      done = true;
      root.classList.add("closing");
      setTimeout(() => {
        cleanup();
        resolve(index);
      }, 350);
    };

    /** 결과 카드를 보여주고 "받기" 를 누르면 끝 */
    let resultIndex = -1;
    const showResult = (index: number, wheelBox?: HTMLElement) => {
      resultIndex = index;
      sound("win");
      // 룰렛은 바퀴 위에 결과 카드를 띄우고, 상자·고르기는 그 자리에서 강조만 한다
      if (wheelBox) {
        const overlay = document.createElement("div");
        overlay.className = "mr-result";
        overlay.appendChild(cardEl(cards[index]));
        wheelBox.appendChild(overlay);
      }
      btn.textContent = ui(lang, "take");
      btn.disabled = false;
      phase = "result";
    };

    // 선택형(상자·고르기)
    let selected = 0;
    let phase: "pick" | "spinning" | "result" = "pick";
    const items: HTMLElement[] = [];

    const select = (i: number) => {
      if (phase !== "pick" || items.length === 0) {
        return;
      }
      selected = (i + items.length) % items.length;
      items.forEach((el, j) => el.classList.toggle("sel", j === selected));
      sound("select");
    };

    const confirm = () => {
      if (done) {
        return;
      }
      if (phase === "result") {
        finish(resultIndex);
        return;
      }
      if (phase !== "pick") {
        return;
      }
      if (mode === "roulette" || mode === "jackpot") {
        spin();
        return;
      }
      if (mode === "choice") {
        items.forEach((el, j) => el.classList.toggle("dim", j !== selected));
        showResult(selected);
        return;
      }
      // 상자: 고른 상자를 열고, 나머지도 무엇이었는지 보여준다
      sound("open");
      items.forEach((el, j) => {
        const opened = cardEl(cards[j]);
        opened.classList.add("revealed");
        if (j === selected) {
          opened.classList.add("sel");
        } else {
          opened.classList.add("dim");
        }
        el.replaceWith(opened);
        items[j] = opened;
      });
      showResult(selected);
    };

    // 룰렛
    let wheel: HTMLElement | undefined;
    const spin = () => {
      phase = "spinning";
      btn.disabled = true;
      sound("spin");
      const n = cards.length;
      const seg = 360 / n;
      const target = Math.floor(rng() * n);
      // 칸 안에서 살짝 어긋나게 멈춘다
      const jitter = (rng() - 0.5) * seg * 0.6;
      const turns = 6;
      const angle = turns * 360 - target * seg + jitter;
      wheel!.style.transition = `transform ${spinMs}ms cubic-bezier(.12,.75,.15,1)`;
      wheel!.style.transform = `rotate(${angle}deg)`;
      // 째깍 소리
      let ticks = 0;
      const tick = setInterval(() => {
        ticks++;
        if (ticks * 120 > spinMs * 0.8) {
          clearInterval(tick);
          return;
        }
        sound("tick");
      }, 120);
      setTimeout(() => {
        clearInterval(tick);
        showResult(target, $(".mr-wheelbox"));
      }, spinMs + 80);
    };

    if (mode === "roulette" || mode === "jackpot") {
      const box = document.createElement("div");
      box.className = "mr-wheelbox";
      wheel = document.createElement("div");
      wheel.className = "mr-wheel";
      const n = cards.length;
      const seg = 360 / n;
      const stops = cards
        .map((c, i) => {
          const base = RARITY_COLORS[c.rarity] ?? RARITY_COLORS[0];
          const shade = i % 2 === 0 ? base : `color-mix(in srgb, ${base} 70%, #302840)`;
          return `${shade} ${i * seg - seg / 2}deg ${(i + 1) * seg - seg / 2}deg`;
        })
        .join(",");
      wheel.style.background = `conic-gradient(from 0deg, ${stops})`;
      cards.forEach((c, i) => {
        const slot = document.createElement("div");
        slot.className = "mr-slot";
        slot.style.transform = `rotate(${i * seg}deg)`;
        const img = document.createElement("img");
        img.src = c.icon;
        img.alt = c.name;
        slot.appendChild(img);
        wheel!.appendChild(slot);
      });
      const pointer = document.createElement("div");
      pointer.className = "mr-pointer";
      const hub = document.createElement("div");
      hub.className = "mr-hub";
      hub.textContent = "★";
      hub.classList.add("sym");
      box.append(wheel, pointer, hub);
      stage.appendChild(box);
      btn.textContent = ui(lang, "spin");
    } else {
      cards.forEach((c, i) => {
        let el: HTMLElement;
        if (mode === "box") {
          el = document.createElement("div");
          el.className = "mr-item closed";
          const chest = document.createElement("div");
          chest.className = "mr-chest";
          chest.textContent = "🎁";
          const label = document.createElement("div");
          label.className = "mr-name";
          label.textContent = String(i + 1);
          el.append(chest, label);
        } else {
          el = cardEl(c);
        }
        el.addEventListener("click", () => {
          if (phase !== "pick") {
            return;
          }
          if (selected === i) {
            confirm();
          } else {
            select(i);
          }
        });
        stage.appendChild(el);
        items.push(el);
      });
      items[0]?.classList.add("sel");
      btn.textContent = ui(lang, mode === "box" ? "open" : "pick");
    }

    btn.addEventListener("click", () => confirm());

    const onKeyDown = (e: KeyboardEvent) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      if (e.repeat) {
        return;
      }
      const k = e.key;
      if (k === "ArrowLeft" || k === "ArrowUp") {
        select(selected - 1);
      } else if (k === "ArrowRight" || k === "ArrowDown") {
        select(selected + 1);
      } else if (/^[1-9]$/.test(k) && Number(k) <= items.length) {
        select(Number(k) - 1);
      } else if (k === "Enter" || k === " " || k.toLowerCase() === "z") {
        confirm();
      }
    };
    const swallow = (e: Event) => e.stopImmediatePropagation();
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", swallow, true);

    const cleanup = () => {
      if (activeCleanup === cleanup) {
        activeCleanup = undefined;
      }
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", swallow, true);
      root.remove();
    };
    activeCleanup = cleanup;
  });
}
