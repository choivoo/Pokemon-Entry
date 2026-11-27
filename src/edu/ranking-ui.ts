/** 랭킹 화면: 우리 반 · 우리 학년(반별) · 우리 학교 */
import { DIFFICULTY_RULES } from "#app/edu/difficulty";
import { classLabel, describeClass, type LearnerProfile } from "#app/edu/profile";
import { SUBJECT_NAMES, SUBJECTS, type Subject } from "#app/edu/question";
import {
  aggregateClasses,
  classText,
  displayName,
  fetchRanking,
  isRankingOnline,
  type RankRow,
  type RankScope,
  withRanks,
} from "#app/edu/ranking";
import { type AllStats, getUid } from "#app/edu/stats";
import { baseCss, closeOverlay, el, isolateKeys } from "#app/edu/ui-kit";

export const RANKING_OVERLAY_ID = "edu-ranking-overlay";

/** 지금 열려 있는 랭킹 화면의 정리 함수 (키 입력 가로채기를 확실히 풀어 준다) */
let activeCleanup: (() => void) | undefined;

const CSS = `${baseCss(RANKING_OVERLAY_ID, "#f8d030", "#c8a038")}
#${RANKING_OVERLAY_ID} .rk-me{display:flex;flex-wrap:wrap;gap:calc(14 * var(--s));background:#183828;border:calc(4 * var(--s)) solid #58d068;border-radius:calc(9 * var(--s));padding:calc(8 * var(--s)) calc(14 * var(--s));font-size:calc(26 * var(--s) * var(--f));margin:calc(6 * var(--s)) 0 calc(8 * var(--s))}
#${RANKING_OVERLAY_ID} .rk-me b{color:#f8d030;font-weight:normal}
#${RANKING_OVERLAY_ID} .rk-table{display:flex;flex-direction:column;gap:calc(5 * var(--s));margin-top:calc(8 * var(--s));max-height:calc(380 * var(--s));overflow:auto}
#${RANKING_OVERLAY_ID} .rk-row{display:grid;grid-template-columns:calc(70 * var(--s)) 1fr calc(130 * var(--s)) calc(90 * var(--s));align-items:center;gap:calc(8 * var(--s));background:#202840;border-radius:calc(8 * var(--s));padding:calc(8 * var(--s)) calc(12 * var(--s));font-size:calc(28 * var(--s) * var(--f))}
#${RANKING_OVERLAY_ID} .rk-row.head{background:none;color:#9fb0e8;font-size:calc(22 * var(--s) * var(--f));padding-top:0;padding-bottom:0}
#${RANKING_OVERLAY_ID} .rk-row.me{background:#305830;outline:calc(3 * var(--s)) solid #58d068}
#${RANKING_OVERLAY_ID} .rk-row .rk-rank{color:#f8d030;text-align:center}
#${RANKING_OVERLAY_ID} .rk-row.r1 .rk-rank::before{content:"🥇 "}
#${RANKING_OVERLAY_ID} .rk-row.r2 .rk-rank::before{content:"🥈 "}
#${RANKING_OVERLAY_ID} .rk-row.r3 .rk-rank::before{content:"🥉 "}
#${RANKING_OVERLAY_ID} .rk-row .rk-pts{text-align:right;color:#f8f8f8}
#${RANKING_OVERLAY_ID} .rk-row .rk-sub{text-align:right;color:#b8c8f8;font-size:calc(22 * var(--s) * var(--f))}
#${RANKING_OVERLAY_ID} .rk-row small{display:block;color:#9fb0e8;font-size:calc(20 * var(--s) * var(--f))}
#${RANKING_OVERLAY_ID} .rk-empty{padding:calc(24 * var(--s));text-align:center;color:#b8c8f8;font-size:calc(26 * var(--s) * var(--f))}
`;

export interface RankingOptions {
  profile: LearnerProfile;
  /** 이 기기의 내 기록 */
  stats: AllStats;
  /** 처음 보여 줄 과목 (기본: 프로필의 과목) */
  subject?: Subject;
  /** 테스트에서 서버 요청을 바꿔 끼운다 */
  fetchRows?: (scope: RankScope, profile: LearnerProfile, subject: Subject) => Promise<RankRow[]>;
  online?: boolean;
}

const SCOPES: [RankScope, string][] = [
  ["class", "우리 반"],
  ["grade", "우리 학년 (반별)"],
  ["school", "우리 학교"],
];

/** 랭킹 화면을 띄운다. 닫으면 resolve 된다. */
export function showRanking(opts: RankingOptions): Promise<void> {
  return new Promise(resolve => {
    activeCleanup?.();
    document.getElementById(RANKING_OVERLAY_ID)?.remove();
    const { profile, stats } = opts;
    const online = opts.online ?? isRankingOnline();
    const load = opts.fetchRows ?? fetchRanking;
    let subject: Subject = opts.subject ?? profile.subject;
    let scope: RankScope = "class";
    const myUid = getUid();

    const root = el("div", { attrs: { id: RANKING_OVERLAY_ID, role: "dialog", "aria-modal": "true" } });
    root.appendChild(el("style", { text: CSS }));
    const card = el("div", { class: "ek-card" });
    root.appendChild(card);
    isolateKeys(root);

    card.append(
      el("div", { class: "ek-title", text: "🏆 랭킹" }),
      el("div", { class: "ek-sub", text: describeClass(profile) }),
    );

    const subjectRow = el("div", { class: "ek-row grow" });
    const scopeRow = el("div", { class: "ek-row grow" });
    scopeRow.style.marginTop = "calc(8 * var(--s))";
    const me = el("div", { class: "rk-me" });
    const table = el("div", { class: "rk-table" });
    const msg = el("div", { class: "ek-msg" });

    const renderMe = () => {
      const s = stats[subject];
      me.replaceChildren(
        el("span", {}, "내 점수 ", el("b", { text: s.points.toLocaleString() })),
        el("span", {}, "푼 문제 ", el("b", { text: String(s.solved) })),
        el("span", {}, "최고 층 ", el("b", { text: String(s.bestWave) })),
        el("span", {}, "최고 연속 ", el("b", { text: String(s.bestStreak) })),
        el("span", {}, `난이도 ${DIFFICULTY_RULES[profile.difficulty].name}`),
      );
    };

    const row = (cls: string, rank: string, name: string, sub: string, pts: string, extra: string): HTMLElement => {
      const nameCell = el("div", {}, name);
      if (sub) {
        nameCell.appendChild(el("small", { text: sub }));
      }
      return el(
        "div",
        { class: `rk-row ${cls}` },
        el("div", { class: "rk-rank", text: rank }),
        nameCell,
        el("div", { class: "rk-pts", text: pts }),
        el("div", { class: "rk-sub", text: extra }),
      );
    };

    let seq = 0;
    const render = async () => {
      renderMe();
      for (const b of Array.from(subjectRow.children) as HTMLButtonElement[]) {
        b.classList.toggle("on", b.dataset.v === subject);
      }
      for (const b of Array.from(scopeRow.children) as HTMLButtonElement[]) {
        b.classList.toggle("on", b.dataset.v === scope);
      }
      table.replaceChildren();
      msg.textContent = "";
      if (!profile.rankingConsent) {
        msg.textContent = "내 점수는 아직 랭킹에 올라가지 않아요. 메뉴의 '학습 설정'에서 동의에 체크하면 올라가요.";
      }
      if (!online) {
        table.appendChild(
          el("div", {
            class: "rk-empty",
            text: "아직 랭킹 서버가 연결되지 않았어요. 서버가 연결되면 같은 반 친구들과 점수를 겨룰 수 있어요. 지금은 이 기기의 내 기록만 보여요.",
          }),
        );
        return;
      }
      const mine = ++seq;
      table.appendChild(el("div", { class: "rk-empty", text: "불러오는 중…" }));
      try {
        const rows = await load(scope, profile, subject);
        if (mine !== seq) {
          return;
        }
        table.replaceChildren();
        if (rows.length === 0) {
          table.appendChild(
            el("div", { class: "rk-empty", text: "아직 기록이 없어요. 문제를 풀면 여기에 이름이 올라가요!" }),
          );
          return;
        }
        if (scope === "grade") {
          table.appendChild(row("head", "순위", "반", "", "점수", "인원"));
          for (const c of withRanks(aggregateClasses(rows))) {
            const isMine = c.grade === profile.grade && c.className === profile.className.trim();
            table.appendChild(
              row(
                `r${c.rank}${isMine ? " me" : ""}`,
                String(c.rank),
                `${c.grade}학년 ${classLabel(c.className)}`,
                "",
                c.points.toLocaleString(),
                `${c.students}명`,
              ),
            );
          }
        } else {
          table.appendChild(row("head", "순위", "이름", "", "점수", "푼 문제"));
          for (const r of withRanks(rows)) {
            const isMine = r.uid === myUid;
            table.appendChild(
              row(
                `r${r.rank}${isMine ? " me" : ""}`,
                String(r.rank),
                displayName(r),
                scope === "school" ? classText(r) : "",
                r.points.toLocaleString(),
                String(r.solved),
              ),
            );
          }
        }
      } catch (e) {
        if (mine !== seq) {
          return;
        }
        table.replaceChildren(
          el("div", { class: "rk-empty", text: "랭킹을 불러오지 못했어요. 잠시 뒤에 다시 열어 보세요." }),
        );
        msg.textContent = e instanceof Error ? e.message : "";
      }
    };

    for (const s of SUBJECTS) {
      const b = el("button", { text: SUBJECT_NAMES[s], attrs: { type: "button", "data-v": s } });
      b.addEventListener("click", () => {
        subject = s;
        render();
      });
      subjectRow.appendChild(b);
    }
    for (const [sc, label] of SCOPES) {
      const b = el("button", { class: "ghost", text: label, attrs: { type: "button", "data-v": sc } });
      b.addEventListener("click", () => {
        scope = sc;
        render();
      });
      scopeRow.appendChild(b);
    }

    const close = el("button", { class: "go", text: "닫기", attrs: { type: "button" } });
    // 이 화면이 열려 있는 동안 게임이 키 입력을 받지 못하게 하고, Esc / Enter / X 로 닫는다
    const onKey = (e: KeyboardEvent) => {
      if (!root.isConnected) {
        release();
        return;
      }
      e.stopImmediatePropagation();
      e.preventDefault();
      if (e.key === "Escape" || e.key === "Enter" || e.key.toLowerCase() === "x") {
        finish();
      }
    };
    const swallowUp = (e: Event) => e.stopImmediatePropagation();
    const release = () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", swallowUp, true);
      if (activeCleanup === release) {
        activeCleanup = undefined;
      }
    };
    let finished = false;
    function finish() {
      if (finished) {
        return;
      }
      finished = true;
      release();
      closeOverlay(root, resolve);
    }
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", swallowUp, true);
    activeCleanup = release;
    close.addEventListener("click", finish);

    const actions = el("div", { class: "su-actions" }, close);
    actions.style.cssText = "display:flex;margin-top:calc(14 * var(--s))";
    card.append(subjectRow, scopeRow, me, table, msg, actions);
    document.body.appendChild(root);
    render();
  });
}
