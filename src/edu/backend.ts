/**
 * 서버(Supabase) 연결 설정과 함수 호출.
 * 주소·공개 키가 없으면 "서버 없음" 상태로, 게임은 이 브라우저 안의 계정 서버로 동작한다.
 */

/**
 * 사람이 붙여 넣다가 흔히 생기는 실수를 고친다.
 * 공백·따옴표 제거, 끝의 `/` 와 `/rest/v1` 제거, `https://` 가 빠진 주소에 붙이기.
 */
export function normalizeUrl(raw: string): string {
  let u = raw.trim().replace(/^["']|["']$/g, "");
  if (u && !/^https?:\/\//.test(u) && /\.supabase\.co/.test(u)) {
    u = `https://${u}`;
  }
  return u
    .replace(/\/+$/, "")
    .replace(/\/(rest|auth|storage)\/v1$/, "")
    .replace(/\/+$/, "");
}

export const normalizeKey = (raw: string): string =>
  raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");

export const backend = {
  fetch: (url: string, init?: RequestInit): Promise<Response> => fetch(url, init),
  url: (): string => normalizeUrl(import.meta.env.VITE_SUPABASE_URL ?? ""),
  key: (): string => normalizeKey(import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""),
  /** 마지막으로 서버에서 받은 오류 (화면에 원인을 보여 주는 데 쓴다) */
  lastError: "",
};

/** 서버 주소가 안전한지: https 이거나, 내 컴퓨터에서 시험하는 주소 */
export function isSafeUrl(url: string): boolean {
  return url.startsWith("https://") || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(url);
}

/** `eyJ…` 로 시작하는 JWT 모양의 키인지 (예전 방식의 anon 키) */
function isJwt(key: string): boolean {
  return /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(key);
}

/**
 * 비밀 키(service_role, sb_secret_…)는 절대 웹사이트에 넣으면 안 된다.
 * 실수로 넣었으면 사용을 거부해서 키가 퍼지는 것을 막는다.
 */
export function isSecretKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) {
    return true;
  }
  if (!isJwt(key)) {
    return false;
  }
  try {
    const payload = JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

/** 서버가 설정되어 있는지 (주소가 안전하고, 공개 키이고, 비밀 키가 아닌 경우) */
export function isBackendOnline(): boolean {
  const key = backend.key();
  return isSafeUrl(backend.url()) && key.length > 20 && !isSecretKey(key);
}

/**
 * 서버에 보낼 헤더.
 * 예전 anon 키(JWT)는 Authorization 에도 같이 보내고, 새 공개 키(sb_publishable_…)는 apikey 로만 보낸다.
 */
export const authHeaders = (extra: Record<string, string> = {}): Record<string, string> => ({
  apikey: backend.key(),
  ...(isJwt(backend.key()) ? { Authorization: `Bearer ${backend.key()}` } : {}),
  "Content-Type": "application/json",
  ...extra,
});

export class BackendError extends Error {}

/** 서버 오류를 사람이 읽을 수 있게 줄여서 기억해 둔다 */
function remember(message: string): void {
  backend.lastError = message.replace(/\s+/g, " ").slice(0, 140);
}

/** 서버 함수(`edu_*`)를 부른다. 연결이 안 되면 예외. */
export async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await backend.fetch(`${backend.url()}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(args),
    });
  } catch {
    remember("서버에 닿지 않아요 (주소가 틀렸거나 인터넷·프로젝트 상태 문제)");
    throw new BackendError("서버에 연결하지 못했어요.");
  }
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { message?: string; hint?: string; code?: string };
      detail = [body.code, body.message].filter(Boolean).join(" ");
    } catch {
      // 본문이 없어도 상태 번호는 남긴다
    }
    remember(`서버 오류 ${res.status}${detail ? `: ${detail}` : ""}`);
    throw new BackendError(`서버 오류 (${res.status})`);
  }
  backend.lastError = "";
  return (await res.json()) as T;
}
