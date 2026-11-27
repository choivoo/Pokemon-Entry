/**
 * 서버 연결 점검 화면.
 * 사이트 주소 끝에 `?diag` 를 붙여서 열면, 주소·키·서버 설정(SQL)이 잘 되어 있는지 하나씩 확인해서 보여 준다.
 * 개발자 도구 없이 아이패드에서도 원인을 찾을 수 있게 만들었다.
 */
import { authHeaders, backend, isSafeUrl, isSecretKey, normalizeKey, normalizeUrl } from "#app/edu/backend";
import { baseCss, closeOverlay, el, isolateKeys } from "#app/edu/ui-kit";

export const DIAG_OVERLAY_ID = "edu-diag-overlay";

export interface DiagLine {
  ok: boolean;
  label: string;
  detail: string;
}

export interface DiagResult {
  lines: DiagLine[];
  /** 모두 정상인지 */
  ok: boolean;
  /** 해결 방법 (문제가 있을 때) */
  tip: string;
}

/** 키 종류를 사람이 읽을 수 있게 */
export function keyKind(key: string): string {
  if (!key) {
    return "없음";
  }
  if (isSecretKey(key)) {
    return "비밀 키 (절대 쓰면 안 돼요!)";
  }
  if (key.startsWith("sb_publishable_")) {
    return "공개 키 (publishable)";
  }
  if (/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(key)) {
    return "공개 키 (anon, eyJ…)";
  }
  return "알 수 없는 모양";
}

/** 서버가 돌려준 상태와 내용으로 원인과 해결 방법을 말해 준다 */
export function explainResponse(status: number, body: string): string {
  const text = body.toLowerCase();
  if (status === 200) {
    return "";
  }
  if (status === 401 || status === 403) {
    if (text.includes("legacy") || text.includes("disabled")) {
      return "옛 키(anon)가 꺼져 있어요. Supabase 의 API Keys 에서 'Publishable key'(sb_publishable_…)를 복사해서 GitHub 변수 SUPABASE_ANON_KEY 를 바꾸고, 다시 배포하세요.";
    }
    if (text.includes("permission denied") || text.includes("42501")) {
      return "서버 설정(SQL)의 권한 부분이 빠졌어요. SQL Editor 에서 schema.sql 전체를 다시 Run 하세요.";
    }
    return "키가 맞지 않아요. API Keys 에서 공개 키를 다시 복사해서 GitHub 변수 SUPABASE_ANON_KEY 를 바꾸고(공백 없이), 다시 배포하세요.";
  }
  if (status === 404 || text.includes("pgrst202") || text.includes("could not find the function")) {
    return "서버 설정(SQL)이 아직 안 들어갔거나 일부만 들어갔어요. SQL Editor 에서 schema.sql 전체를 복사해서 다시 Run 하세요. (주소 철자도 확인하세요)";
  }
  if (status === 406 || status === 400) {
    return "서버가 요청을 이해하지 못했어요. SQL Editor 에서 schema.sql 을 다시 Run 해 보세요.";
  }
  if (status === 429) {
    return "요청이 너무 많아서 잠시 막혔어요. 1분 뒤에 다시 점검하세요.";
  }
  if (status >= 500) {
    return "Supabase 쪽 문제예요. 프로젝트가 일시정지(Paused)면 Supabase 에서 Restore 를 누르고, 잠시 뒤 다시 점검하세요.";
  }
  return "알 수 없는 오류예요. 이 화면을 캡처해서 알려 주세요.";
}

/** 연결 상태를 점검한다 */
export async function runDiagnostics(): Promise<DiagResult> {
  const lines: DiagLine[] = [];
  const url = normalizeUrl(import.meta.env.VITE_SUPABASE_URL ?? "");
  const key = normalizeKey(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "");
  let tip = "";
  const fail = (t: string) => {
    tip ||= t;
  };

  // 1) 주소
  if (!url) {
    lines.push({ ok: false, label: "서버 주소", detail: "비어 있어요" });
    fail(
      "GitHub 변수 SUPABASE_URL 이 사이트에 들어가지 않았어요. 변수 이름 철자, 'Variables' 탭인지(Secrets 아님), 값이 맞는지 확인하고 Actions 에서 다시 배포하세요.",
    );
  } else if (isSafeUrl(url)) {
    lines.push({ ok: true, label: "서버 주소", detail: url.replace(/^https?:\/\//, "") });
  } else {
    lines.push({ ok: false, label: "서버 주소", detail: `${url} — https:// 로 시작해야 해요` });
    fail("SUPABASE_URL 은 https://….supabase.co 모양이어야 해요.");
  }

  // 2) 키
  const kind = keyKind(key);
  const keyOk = !!key && key.length > 20 && !isSecretKey(key) && kind !== "알 수 없는 모양";
  lines.push({ ok: keyOk, label: "키", detail: kind });
  if (isSecretKey(key)) {
    fail(
      "비밀 키가 들어 있어요! 지금 바로 Supabase 에서 그 키를 폐기(rotate)하고, 공개 키(anon / publishable)로 바꾸세요.",
    );
  } else if (!keyOk) {
    fail(
      "키가 비었거나 모양이 이상해요. API Keys 에서 공개 키(anon 또는 publishable)를 복사해서 GitHub 변수 SUPABASE_ANON_KEY 에 넣으세요.",
    );
  }

  if (!url || !isSafeUrl(url) || !keyOk) {
    return { lines, ok: false, tip };
  }

  // 3) 서버 함수 부르기
  try {
    const res = await backend.fetch(`${url}/rest/v1/rpc/edu_player_count`, {
      method: "POST",
      headers: authHeaders(),
      body: "{}",
    });
    const body = await res.text();
    if (res.ok) {
      let n = "?";
      try {
        n = String((JSON.parse(body) as { playerCount?: number }).playerCount ?? "?");
      } catch {
        // 숫자를 못 읽어도 연결은 된 것
      }
      lines.push({ ok: true, label: "서버 함수 (edu_player_count)", detail: `정상 — 가입한 학생 ${n}명` });
    } else {
      lines.push({
        ok: false,
        label: "서버 함수 (edu_player_count)",
        detail: `HTTP ${res.status} ${body.slice(0, 90)}`,
      });
      fail(explainResponse(res.status, body));
    }
  } catch {
    lines.push({ ok: false, label: "서버 함수 (edu_player_count)", detail: "서버에 닿지 않아요" });
    fail(
      "서버에 닿지 않아요. 주소 철자를 확인하고, Supabase 프로젝트가 일시정지(Paused)가 아닌지 보세요. 인터넷도 확인하세요.",
    );
  }

  // 4) 순위표 읽기
  try {
    const res = await backend.fetch(`${url}/rest/v1/scores?select=uid&limit=1`, { headers: authHeaders() });
    const body = await res.text();
    lines.push(
      res.ok
        ? { ok: true, label: "순위표 읽기 (scores)", detail: "정상" }
        : { ok: false, label: "순위표 읽기 (scores)", detail: `HTTP ${res.status} ${body.slice(0, 90)}` },
    );
    if (!res.ok) {
      fail(explainResponse(res.status, body));
    }
  } catch {
    lines.push({ ok: false, label: "순위표 읽기 (scores)", detail: "서버에 닿지 않아요" });
  }

  return { lines, ok: lines.every(l => l.ok), tip };
}

/** 점검 화면을 띄운다 */
export function showDiagnostics(): Promise<void> {
  return new Promise(resolve => {
    document.getElementById(DIAG_OVERLAY_ID)?.remove();
    const root = el("div", { attrs: { id: DIAG_OVERLAY_ID, role: "dialog", "aria-modal": "true" } });
    root.appendChild(
      el("style", {
        text: `${baseCss(DIAG_OVERLAY_ID, "#58d068", "#58a068")}
#${DIAG_OVERLAY_ID} .ek-card{width:calc(900 * var(--s))}
#${DIAG_OVERLAY_ID} .dg-line{display:flex;gap:calc(12 * var(--s));padding:calc(10 * var(--s)) calc(12 * var(--s));margin-top:calc(8 * var(--s));background:#202840;border-radius:calc(9 * var(--s));font-size:calc(28 * var(--s) * var(--f));line-height:1.2;word-break:break-all}
#${DIAG_OVERLAY_ID} .dg-line b{flex:none;width:calc(40 * var(--s))}
#${DIAG_OVERLAY_ID} .dg-line small{display:block;color:#b8c8f8;font-size:calc(24 * var(--s) * var(--f))}
#${DIAG_OVERLAY_ID} .dg-tip{margin-top:calc(14 * var(--s));padding:calc(12 * var(--s));background:#583820;border:calc(4 * var(--s)) solid #f8a038;border-radius:calc(9 * var(--s));font-size:calc(28 * var(--s) * var(--f));line-height:1.25;color:#ffe8c0}
#${DIAG_OVERLAY_ID} .dg-good{background:#183828;border-color:#58d068;color:#c0ffc8}
#${DIAG_OVERLAY_ID} .su-actions{display:flex;gap:calc(10 * var(--s));margin-top:calc(14 * var(--s))}
#${DIAG_OVERLAY_ID} .su-actions button{flex:1}`,
      }),
    );
    const card = el("div", { class: "ek-card" });
    root.appendChild(card);
    isolateKeys(root);
    const result = el("div");
    const close = el("button", { class: "go", text: "닫기", attrs: { type: "button" } });
    const again = el("button", { class: "ghost", text: "다시 점검", attrs: { type: "button" } });
    card.append(
      el("div", { class: "ek-title", text: "서버 연결 점검" }),
      el("div", { class: "ek-sub", text: "주소·키·서버 설정이 잘 되어 있는지 하나씩 확인해요" }),
      result,
      el("div", { class: "su-actions" }, again, close),
    );

    const run = async () => {
      result.replaceChildren(el("div", { class: "ek-note", text: "점검 중…" }));
      const r = await runDiagnostics();
      result.replaceChildren(
        ...r.lines.map(l =>
          el(
            "div",
            { class: "dg-line" },
            el("b", { text: l.ok ? "✔" : "✘" }),
            el("div", {}, l.label, el("small", { text: l.detail })),
          ),
        ),
        el("div", {
          class: r.ok ? "dg-tip dg-good" : "dg-tip",
          text: r.ok ? "서버가 잘 연결되어 있어요! 🎉 그래도 게임에서 문제가 나면 알려 주세요." : `해결 방법: ${r.tip}`,
        }),
      );
    };
    again.addEventListener("click", run);
    close.addEventListener("click", () => closeOverlay(root, resolve));
    document.body.appendChild(root);
    run();
  });
}

/** 주소에 `?diag` 가 붙어 있으면 점검 화면을 띄운다 */
export function maybeShowDiagnostics(): void {
  if (typeof location !== "undefined" && /[?&#]diag(\b|=)/.test(location.search + location.hash)) {
    void showDiagnostics();
  }
}
