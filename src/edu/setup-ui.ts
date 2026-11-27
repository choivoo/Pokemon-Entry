/**
 * 학습 설정 화면: 과목 · 학년/학기 · 난이도 · 학교 · 반 · 번호 · 별명.
 * 새 게임을 시작할 때와 메뉴의 "학습 설정"에서 열린다.
 */
import { DIFFICULTIES, DIFFICULTY_RULES } from "#app/edu/difficulty";
import { manualSchool, SchoolSearchError, searchSchools } from "#app/edu/neis";
import { DEFAULT_PROFILE, type LearnerProfile, type School, validateProfile } from "#app/edu/profile";
import { SUBJECT_NAMES, SUBJECTS, termIndex, termLabel } from "#app/edu/question";
import { termCategories } from "#app/edu/select";
import { baseCss, closeOverlay, el, isolateKeys } from "#app/edu/ui-kit";

export const SETUP_OVERLAY_ID = "edu-setup-overlay";

export interface SetupOptions {
  /** 처음 채워 둘 값 (없으면 기본값) */
  initial?: LearnerProfile | null;
  /** 취소 버튼을 보일지 */
  allowCancel?: boolean;
  title?: string;
  /** 시작 버튼 글자 */
  confirmLabel?: string;
  /** 테스트에서 학교 검색을 바꿔 끼운다 */
  search?: (q: string) => Promise<School[]>;
  /** 학교·반·번호는 이미 정해진 경우(과목·학년만 바꾸는 화면) */
  lockIdentity?: boolean;
}

const CSS = `${baseCss(SETUP_OVERLAY_ID)}
#${SETUP_OVERLAY_ID} .ek-card{width:calc(1020 * var(--s))}
#${SETUP_OVERLAY_ID} .su-grid{display:grid;grid-template-columns:1fr 1fr;gap:calc(24 * var(--s))}
#${SETUP_OVERLAY_ID} .su-grid>div>.ek-h:first-child{margin-top:0}
@media (orientation:portrait){#${SETUP_OVERLAY_ID} .ek-card{width:calc(780 * var(--s))}#${SETUP_OVERLAY_ID} .su-grid{grid-template-columns:1fr}}
#${SETUP_OVERLAY_ID} button{white-space:nowrap}
#${SETUP_OVERLAY_ID} .su-results{display:flex;flex-direction:column;gap:calc(6 * var(--s));max-height:calc(230 * var(--s));overflow:auto;margin-top:calc(8 * var(--s))}
#${SETUP_OVERLAY_ID} .su-res{display:flex;flex-direction:column;align-items:flex-start;gap:calc(4 * var(--s));text-align:left;min-height:calc(66 * var(--s));padding:calc(8 * var(--s)) calc(14 * var(--s))}
#${SETUP_OVERLAY_ID} .su-res small{font-size:calc(22 * var(--s) * var(--f));color:#c8d0f8}
#${SETUP_OVERLAY_ID} .su-chosen{display:flex;align-items:center;gap:calc(10 * var(--s));background:#183828;border:calc(4 * var(--s)) solid #58d068;border-radius:calc(9 * var(--s));padding:calc(8 * var(--s)) calc(14 * var(--s));font-size:calc(30 * var(--s) * var(--f))}
#${SETUP_OVERLAY_ID} .su-chosen small{display:block;font-size:calc(22 * var(--s) * var(--f));color:#b0f8b8}
#${SETUP_OVERLAY_ID} .su-chosen button{margin-left:auto}
#${SETUP_OVERLAY_ID} .su-desc{font-size:calc(24 * var(--s) * var(--f));margin-top:calc(6 * var(--s))}
#${SETUP_OVERLAY_ID} .su-units{font-size:calc(22 * var(--s) * var(--f));color:#b8c8f8;margin-top:calc(6 * var(--s))}
#${SETUP_OVERLAY_ID} .su-link{background:none;box-shadow:none;color:#9fb0ff;text-decoration:underline;min-height:0;padding:calc(4 * var(--s)) 0;font-size:calc(24 * var(--s) * var(--f))}
#${SETUP_OVERLAY_ID} .su-chip{min-width:calc(56 * var(--s));padding:0 calc(8 * var(--s))}
#${SETUP_OVERLAY_ID} .su-field{display:flex;flex-direction:column;gap:calc(4 * var(--s));flex:1;min-width:calc(150 * var(--s))}
#${SETUP_OVERLAY_ID} .su-field label{font-size:calc(22 * var(--s) * var(--f));color:#b8c8f8}
#${SETUP_OVERLAY_ID} .su-actions{display:flex;gap:calc(10 * var(--s));margin-top:calc(14 * var(--s))}
#${SETUP_OVERLAY_ID} .su-actions button{flex:1}
`;

/**
 * 학습 설정 화면을 띄운다.
 * @returns 확인한 프로필 (취소하면 `null`)
 */
export function showSetup(opts: SetupOptions = {}): Promise<LearnerProfile | null> {
  return new Promise(resolve => {
    document.getElementById(SETUP_OVERLAY_ID)?.remove();
    const p: LearnerProfile = { ...DEFAULT_PROFILE, ...(opts.initial ?? {}) };
    const search = opts.search ?? searchSchools;

    const root = el("div", { attrs: { id: SETUP_OVERLAY_ID, role: "dialog", "aria-modal": "true" } });
    root.appendChild(el("style", { text: CSS }));
    const card = el("div", { class: "ek-card" });
    root.appendChild(card);
    isolateKeys(root);

    card.append(
      el("div", { class: "ek-title", text: opts.title ?? "학습 설정" }),
      el("div", { class: "ek-sub", text: "포케로그_국영수(초등) 1.0 · 과목과 학년을 고르면 그 학기 문제가 나와요" }),
    );

    /** 한 줄로 고르는 버튼 묶음 */
    const choiceRow = <T extends string | number>(
      values: readonly T[],
      label: (v: T) => string,
      get: () => T,
      set: (v: T) => void,
      cls = "",
    ): HTMLElement => {
      const row = el("div", { class: "ek-row grow" });
      const refresh = () => {
        for (const b of Array.from(row.children) as HTMLButtonElement[]) {
          b.classList.toggle("on", b.dataset.v === String(get()));
        }
      };
      for (const v of values) {
        const b = el("button", { class: cls, text: label(v), attrs: { type: "button", "data-v": String(v) } });
        b.addEventListener("click", () => {
          set(v);
          refresh();
          onChange();
        });
        row.appendChild(b);
      }
      refresh();
      return row;
    };

    const grid = el("div", { class: "su-grid" });
    const left = el("div");
    const right = el("div");
    grid.append(left, right);
    card.appendChild(grid);

    // #region 과목 · 학년 · 학기
    const units = el("div", { class: "su-units" });
    const onChange = () => {
      const cats = termCategories(p.subject, termIndex(p.grade, p.semester));
      units.textContent = `${SUBJECT_NAMES[p.subject]} ${termLabel(termIndex(p.grade, p.semester))}: ${cats.slice(0, 7).join(" · ")}`;
      desc.textContent = `${DIFFICULTY_RULES[p.difficulty].name} — ${DIFFICULTY_RULES[p.difficulty].description}`;
      desc.style.color = DIFFICULTY_RULES[p.difficulty].color;
    };

    left.appendChild(el("div", { class: "ek-h", text: "1. 과목" }));
    left.appendChild(
      choiceRow(
        SUBJECTS,
        s => SUBJECT_NAMES[s],
        () => p.subject,
        v => (p.subject = v),
      ),
    );
    left.appendChild(el("div", { class: "ek-h", text: "2. 학년 · 학기" }));
    left.appendChild(
      choiceRow(
        [1, 2, 3, 4, 5, 6],
        g => `${g}`,
        () => p.grade,
        v => (p.grade = v),
      ),
    );
    const semRow = choiceRow(
      [1, 2],
      s => `${s}학기`,
      () => p.semester,
      v => (p.semester = v),
    );
    semRow.style.marginTop = "calc(8 * var(--s))";
    left.appendChild(semRow);
    left.appendChild(units);
    // #endregion

    // #region 난이도
    left.appendChild(el("div", { class: "ek-h", text: "3. 난이도" }));
    left.appendChild(
      choiceRow(
        DIFFICULTIES,
        d => DIFFICULTY_RULES[d].name,
        () => p.difficulty,
        v => (p.difficulty = v),
      ),
    );
    const desc = el("div", { class: "su-desc" });
    card.appendChild(desc);
    // #endregion

    // #region 학교 · 반 · 번호
    const idBox = el("div");
    if (!opts.lockIdentity) {
      idBox.appendChild(el("div", { class: "ek-h", text: "4. 우리 학교 · 반" }));
      const chosen = el("div", { class: "su-chosen" });
      const searchRow = el("div", { class: "ek-row" });
      const searchInput = el("input", {
        attrs: {
          type: "text",
          placeholder: "학교 이름 (예: ○○초등학교)",
          "aria-label": "학교 이름",
          maxlength: "20",
          autocomplete: "off",
        },
      });
      searchInput.style.flex = "1";
      const searchBtn = el("button", { text: "찾기", attrs: { type: "button" } });
      searchRow.append(searchInput, searchBtn);
      const results = el("div", { class: "su-results" });
      const manualLink = el("button", {
        class: "su-link",
        text: "학교가 안 나오면 직접 입력하기",
        attrs: { type: "button" },
      });
      const manualRow = el("div", { class: "ek-row" });
      manualRow.style.display = "none";
      const manualInput = el("input", {
        attrs: { type: "text", placeholder: "학교 이름 전체", "aria-label": "학교 이름 직접 입력", maxlength: "20" },
      });
      manualInput.style.flex = "1";
      const manualBtn = el("button", { text: "이 이름으로 정하기", attrs: { type: "button" } });
      manualRow.append(manualInput, manualBtn);
      const searchMsg = el("div", { class: "ek-note" });

      const showChosen = () => {
        chosen.replaceChildren();
        if (!p.school) {
          chosen.style.display = "none";
          searchRow.style.display = "";
          return;
        }
        chosen.style.display = "flex";
        searchRow.style.display = "none";
        results.replaceChildren();
        manualRow.style.display = "none";
        searchMsg.textContent = "";
        const info = el(
          "div",
          {},
          p.school.name,
          el("small", { text: [p.school.region, p.school.address].filter(Boolean).join(" ") || "직접 입력한 학교" }),
        );
        const change = el("button", { class: "ghost", text: "바꾸기", attrs: { type: "button" } });
        change.addEventListener("click", () => {
          p.school = null;
          showChosen();
          searchInput.focus();
        });
        chosen.append(el("span", { text: "✔" }), info, change);
      };

      let seq = 0;
      const runSearch = async () => {
        const q = searchInput.value.trim();
        if (q.length < 2) {
          searchMsg.textContent = "학교 이름을 2글자 이상 적어 주세요.";
          return;
        }
        const mine = ++seq;
        searchMsg.textContent = "찾는 중…";
        results.replaceChildren();
        try {
          const list = await search(q);
          if (mine !== seq) {
            return;
          }
          searchMsg.textContent =
            list.length === 0
              ? "찾은 학교가 없어요. 이름을 다시 확인하거나 직접 입력해 주세요."
              : `${list.length}개를 찾았어요. 우리 학교를 눌러 주세요.`;
          for (const s of list) {
            const b = el(
              "button",
              { class: "su-res", attrs: { type: "button" } },
              s.name,
              el("small", { text: [s.region, s.address].filter(Boolean).join(" ") }),
            );
            b.addEventListener("click", () => {
              p.school = s;
              showChosen();
            });
            results.appendChild(b);
          }
          if (list.length === 0) {
            manualRow.style.display = "flex";
          }
        } catch (e) {
          if (mine !== seq) {
            return;
          }
          searchMsg.textContent = `${e instanceof SchoolSearchError ? e.message : "학교를 찾지 못했어요."} 학교 이름을 직접 입력해 주세요.`;
          manualRow.style.display = "flex";
        }
      };
      searchBtn.addEventListener("click", runSearch);
      searchInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          runSearch();
        }
      });
      manualLink.addEventListener("click", () => {
        manualRow.style.display = manualRow.style.display === "none" ? "flex" : "none";
        manualInput.focus();
      });
      manualBtn.addEventListener("click", () => {
        const name = manualInput.value.trim();
        if (name.length < 2) {
          searchMsg.textContent = "학교 이름을 2글자 이상 적어 주세요.";
          return;
        }
        p.school = manualSchool(name);
        showChosen();
      });
      idBox.append(chosen, searchRow, searchMsg, results, manualLink, manualRow);
      showChosen();

      // 반 · 번호 · 별명
      const classInput = el("input", {
        attrs: {
          type: "text",
          maxlength: "8",
          placeholder: "예: 1, 2, 여울반",
          "aria-label": "반",
          value: p.className,
        },
      });
      const noInput = el("input", {
        attrs: {
          type: "number",
          min: "1",
          max: "60",
          inputmode: "numeric",
          "aria-label": "번호",
          value: String(p.studentNo),
        },
      });
      const nickInput = el("input", {
        attrs: { type: "text", maxlength: "8", placeholder: "비워도 돼요", "aria-label": "별명", value: p.nickname },
      });
      const field = (label: string, input: HTMLInputElement) =>
        el("div", { class: "su-field" }, el("label", { text: label }), input);
      const fields = el(
        "div",
        { class: "ek-row" },
        field("반", classInput),
        field("번호", noInput),
        field("별명 (실명 말고!)", nickInput),
      );
      fields.style.marginTop = "calc(10 * var(--s))";
      const chips = el("div", { class: "ek-row" });
      chips.style.marginTop = "calc(8 * var(--s))";
      for (const n of [1, 2, 3, 4, 5, 6]) {
        const c = el("button", { class: "su-chip ghost", text: `${n}반`, attrs: { type: "button" } });
        c.addEventListener("click", () => {
          classInput.value = String(n);
        });
        chips.appendChild(c);
      }
      idBox.append(
        fields,
        chips,
        el("div", {
          class: "ek-note",
          text: "반 이름은 숫자(6)나 이름(여울반)으로 적어요. 별명은 친구들 랭킹에 보여요.",
        }),
      );
      (root as HTMLElement & { _read?: () => void })._read = () => {
        p.className = classInput.value.trim();
        p.studentNo = Number(noInput.value);
        p.nickname = nickInput.value.trim();
      };
    }
    right.appendChild(idBox);
    // #endregion

    const msg = el("div", { class: "ek-msg", attrs: { "aria-live": "assertive" } });
    const actions = el("div", { class: "su-actions" });
    const ok = el("button", { class: "go", text: opts.confirmLabel ?? "저장하고 시작", attrs: { type: "button" } });
    actions.appendChild(ok);
    let cancel: HTMLButtonElement | undefined;
    if (opts.allowCancel) {
      cancel = el("button", { class: "ghost", text: "취소", attrs: { type: "button" } });
      actions.appendChild(cancel);
    }
    card.append(msg, actions);

    let finished = false;
    const finish = (result: LearnerProfile | null) => {
      if (finished) {
        return;
      }
      finished = true;
      closeOverlay(root, () => resolve(result));
    };

    ok.addEventListener("click", () => {
      (root as HTMLElement & { _read?: () => void })._read?.();
      const errors = validateProfile(p);
      const first = Object.values(errors)[0];
      if (first) {
        msg.textContent = first;
        return;
      }
      finish({ ...p, className: p.className.trim(), nickname: p.nickname.trim() });
    });
    cancel?.addEventListener("click", () => finish(null));

    document.body.appendChild(root);
    onChange();
  });
}
