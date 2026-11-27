/**
 * 서버(Supabase) 계정 서버.
 *
 * 게임이 보내는 계정·세이브 요청을 서버 함수(`edu_*`, supabase/schema.sql)로 바꿔서 보낸다.
 * 응답은 원본 서버와 같은 모양으로 돌려줘서 원본 회원가입·로그인·세이브 화면이 그대로 동작하고,
 * 계정과 세이브, 학습 설정, 점수가 모든 기기에서 같아진다.
 */
import { dailySeedFor } from "#api/local-server";
import { rpc } from "#app/edu/backend";
import { type AccountData, applyAccountData } from "#app/edu/sync";

type Init = { method: string; body?: BodyInit | null; headers?: Record<string, string | undefined> };

function respond(body: unknown, status = 200): Response {
  const isText = typeof body === "string";
  return new Response(isText ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": isText ? "text/plain" : "application/json" },
  });
}

function parseBody(body: BodyInit | null | undefined): Record<string, string> {
  if (typeof body !== "string" || body === "") {
    return {};
  }
  if (body.startsWith("{")) {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return Object.fromEntries(new URLSearchParams(body));
}

interface Reply {
  ok: boolean;
  error?: string;
  [k: string]: unknown;
}

/** 서버의 오류 문구를 HTTP 상태로 */
function errorResponse(error = "error"): Response {
  const status =
    error === "session not found" || error === "password doesn't match"
      ? 401
      : error === "too many attempts"
        ? 429
        : error === "save does not exist"
          ? 404
          : 400;
  return respond(error, status);
}

/**
 * 게임의 API 요청 하나를 서버 함수로 처리한다.
 * @param path - 예: `/account/login`, `/savedata/session/get?slot=0&...`
 */
export async function remoteServerFetch(path: string, init: Init): Promise<Response> {
  const url = new URL(path, "http://remote");
  const route = url.pathname;
  const q = url.searchParams;
  const body = parseBody(init.body);
  const token = init.headers?.Authorization ?? "";
  const slot = Number(q.get("slot") ?? 0);

  switch (route) {
    case "/account/register": {
      const r = await rpc<Reply>("edu_register", { p_username: body.username ?? "", p_password: body.password ?? "" });
      return r.ok ? respond("") : errorResponse(r.error);
    }
    case "/account/login": {
      const r = await rpc<Reply>("edu_login", { p_username: body.username ?? "", p_password: body.password ?? "" });
      return r.ok ? respond({ token: r.token }) : errorResponse(r.error);
    }
    case "/game/titlestats": {
      const r = await rpc<{ playerCount: number }>("edu_player_count", {});
      return respond({ playerCount: r.playerCount ?? 0, battleCount: 0 });
    }
    case "/daily/seed":
      return respond(dailySeedFor(new Date()));
    case "/account/logout": {
      await rpc<Reply>("edu_logout", { p_token: token });
      return respond("");
    }
    case "/account/info": {
      const r = await rpc<Reply>("edu_info", { p_token: token });
      if (!r.ok) {
        return errorResponse(r.error);
      }
      const username = String(r.username);
      applyAccountData(username, {
        uid: String(r.uid ?? ""),
        profile: (r.profile as AccountData["profile"]) ?? null,
        scores: (r.scores as AccountData["scores"]) ?? [],
      });
      return respond({
        username,
        lastSessionSlot: Number(r.last_session_slot ?? -1),
        discordId: "",
        googleId: "",
        hasAdminRole: false,
      });
    }
    case "/account/changepw": {
      const r = await rpc<Reply>("edu_change_password", { p_token: token, p_password: body.password ?? "" });
      return r.ok ? respond("") : errorResponse(r.error);
    }
    case "/savedata/system/get": {
      const r = await rpc<Reply>("edu_save_get", { p_token: token, p_kind: "system", p_slot: 0 });
      return r.ok ? respond(String(r.data)) : errorResponse(r.error);
    }
    case "/savedata/system/verify":
      return respond({ valid: true, systemData: null });
    case "/savedata/system/update": {
      const r = await rpc<Reply>("edu_save_put", {
        p_token: token,
        p_kind: "system",
        p_slot: 0,
        p_data: String(init.body ?? ""),
      });
      return r.ok ? respond("") : errorResponse(r.error);
    }
    case "/savedata/session/get": {
      const r = await rpc<Reply>("edu_save_get", { p_token: token, p_kind: "session", p_slot: slot });
      return r.ok ? respond(String(r.data)) : errorResponse(r.error);
    }
    case "/savedata/session/update": {
      const r = await rpc<Reply>("edu_save_put", {
        p_token: token,
        p_kind: "session",
        p_slot: slot,
        p_data: String(init.body ?? ""),
      });
      return r.ok ? respond("") : errorResponse(r.error);
    }
    case "/savedata/session/delete":
    case "/savedata/session/clear": {
      const r = await rpc<Reply>("edu_save_delete", { p_token: token, p_kind: "session", p_slot: slot });
      if (!r.ok) {
        return errorResponse(r.error);
      }
      return route.endsWith("clear") ? respond({ success: true }) : respond("");
    }
    case "/savedata/session/newclear":
      return respond(true);
    case "/savedata/updateall": {
      let parsed: { system?: unknown; session?: unknown; sessionSlotId?: number };
      try {
        parsed = JSON.parse(typeof init.body === "string" ? init.body : "");
      } catch {
        return respond("invalid body", 400);
      }
      const r = await rpc<Reply>("edu_save_all", {
        p_token: token,
        p_system: parsed.system ? JSON.stringify(parsed.system) : null,
        p_session: parsed.session ? JSON.stringify(parsed.session) : null,
        p_slot: typeof parsed.sessionSlotId === "number" ? parsed.sessionSlotId : -1,
      });
      return r.ok ? respond("") : errorResponse(r.error);
    }
  }
  if (route.startsWith("/auth/")) {
    return respond("");
  }
  if (route.startsWith("/admin/")) {
    return respond("forbidden", 403);
  }
  return respond("not found", 404);
}
