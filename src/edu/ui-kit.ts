/** 설정·랭킹 화면이 함께 쓰는 도구: 게임 픽셀 폰트와 에메랄드풍 창 디자인 */

/** 화면 크기에 맞춰 커지고 작아지는 단위(--s)와 공통 모양 */
export const baseCss = (id: string, accent = "#f8d030", border = "#707890"): string => `
#${id}{--s:min(1px,0.112vh,0.15vw);--f:1;position:fixed;inset:0;z-index:2147483002;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(ellipse at center,rgba(24,28,56,.78),rgba(6,6,16,.93));
  font-family:emerald,pkmnems,"Noto Sans KR","Malgun Gothic",sans-serif;color:#f8f8f8;line-height:1.1;
  touch-action:manipulation;animation:ek-fade .25s ease-out}
#${id} *{box-sizing:border-box}
#${id} .ek-card{position:relative;width:calc(780 * var(--s));max-width:96vw;max-height:96vh;overflow:auto;background:#283048;
  border:calc(5 * var(--s)) solid #f8f8f8;border-radius:calc(12 * var(--s));
  box-shadow:0 0 0 calc(5 * var(--s)) #303040,0 0 0 calc(10 * var(--s)) ${border},0 calc(16 * var(--s)) calc(60 * var(--s)) #000c;
  padding:calc(16 * var(--s)) calc(22 * var(--s)) calc(18 * var(--s));animation:ek-pop .35s cubic-bezier(.2,1.4,.4,1)}
#${id} .ek-title{font-size:calc(50 * var(--s) * var(--f));color:${accent};text-shadow:calc(3 * var(--s)) calc(3 * var(--s)) 0 #685010}
#${id} .ek-sub{font-size:calc(26 * var(--s) * var(--f));color:#b8c8f8;margin:calc(4 * var(--s)) 0 calc(10 * var(--s))}
#${id} .ek-h{font-size:calc(28 * var(--s) * var(--f));color:#f8d030;margin:calc(12 * var(--s)) 0 calc(6 * var(--s))}
#${id} .ek-row{display:flex;flex-wrap:wrap;gap:calc(8 * var(--s));align-items:center}
#${id} .ek-row.grow>*{flex:1}
#${id} button{font-family:inherit;font-size:calc(32 * var(--s) * var(--f));min-height:calc(58 * var(--s));padding:0 calc(14 * var(--s));border:0;border-radius:calc(9 * var(--s));
  cursor:pointer;color:#f8f8f8;background:#4858a0;box-shadow:inset 0 calc(-5 * var(--s)) 0 #283070;line-height:1.1}
#${id} button:hover{filter:brightness(1.15)}
#${id} button:active{transform:translateY(calc(2 * var(--s)))}
#${id} button:disabled{opacity:.5;cursor:default}
#${id} button.on{background:#38a048;box-shadow:inset 0 calc(-5 * var(--s)) 0 #206028}
#${id} button.go{background:#e0a020;box-shadow:inset 0 calc(-5 * var(--s)) 0 #906010;font-size:calc(38 * var(--s) * var(--f))}
#${id} button.ghost{background:#505870;box-shadow:inset 0 calc(-5 * var(--s)) 0 #303850}
#${id} input{font-family:inherit;font-size:calc(32 * var(--s) * var(--f));height:calc(58 * var(--s));padding:0 calc(12 * var(--s));color:#f8f8f8;background:#101828;
  border:calc(4 * var(--s)) solid #6878a8;border-radius:calc(9 * var(--s));min-width:0;outline:none;user-select:text;-webkit-user-select:text}
#${id} input:focus{border-color:#f8d030}
#${id} .ek-msg{min-height:calc(40 * var(--s));font-size:calc(26 * var(--s) * var(--f));margin-top:calc(8 * var(--s));color:#ffc0b8}
#${id} .ek-msg.ok{color:#b0f8b8}
#${id} .ek-note{font-size:calc(22 * var(--s) * var(--f));color:#9fb0e8;margin-top:calc(6 * var(--s))}
#${id}.closing{animation:ek-out .3s forwards}
@keyframes ek-fade{from{opacity:0}}
@keyframes ek-pop{from{transform:scale(.8);opacity:0}}
@keyframes ek-out{to{opacity:0;transform:scale(1.05)}}
@media (orientation:portrait){#${id}{--s:min(1px,0.15vw);--f:1.35}}
`;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { class?: string; text?: string; attrs?: Record<string, string> } = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (props.class) {
    e.className = props.class;
  }
  if (props.text !== undefined) {
    e.textContent = props.text;
  }
  for (const [k, v] of Object.entries(props.attrs ?? {})) {
    e.setAttribute(k, v);
  }
  e.append(...children);
  return e;
}

/**
 * 입력 칸이 있는 화면에서 게임이 키 입력을 가져가지 못하게 한다.
 * (입력 칸은 키를 그대로 받고, 게임(window)까지는 올라가지 않는다)
 */
export function isolateKeys(root: HTMLElement): void {
  for (const type of ["keydown", "keyup", "keypress"]) {
    root.addEventListener(type, e => e.stopPropagation());
  }
}

/** 화면 닫는 애니메이션 후 지운다 */
export function closeOverlay(root: HTMLElement, done: () => void, ms = 300): void {
  root.classList.add("closing");
  setTimeout(() => {
    root.remove();
    done();
  }, ms);
}
