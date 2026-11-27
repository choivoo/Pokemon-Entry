/**
 * 서버(Supabase) 연결 설정과 함수 호출.
 * 주소·공개 키가 없으면 "서버 없음" 상태로, 게임은 이 브라우저 안의 계정 서버로 동작한다.
 */

export const backend = {
  fetch: (url: string, init?: RequestInit): Promise<Response> => fetch(url, init),
  url: (): string => (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, ""),
  key: (): string => import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
};

/** 서버 주소가 안전한지: https 이거나, 내 컴퓨터에서 시험하는 주소 */
export function isSafeUrl(url: string): boolean {
  return url.startsWith("https://") || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(url);
}

/** 서버가 설정되어 있는지 */
export function isBackendOnline(): boolean {
  return isSafeUrl(backend.url()) && backend.key().length > 20;
}

export const authHeaders = (extra: Record<string, string> = {}): Record<string, string> => ({
  apikey: backend.key(),
  Authorization: `Bearer ${backend.key()}`,
  "Content-Type": "application/json",
  ...extra,
});

export class BackendError extends Error {}

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
    throw new BackendError("서버에 연결하지 못했어요.");
  }
  if (!res.ok) {
    throw new BackendError(`서버 오류 (${res.status})`);
  }
  return (await res.json()) as T;
}
