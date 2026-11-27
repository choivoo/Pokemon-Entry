/**
 * 브라우저 안에서 동작하는 PokéRogue 계정 서버.
 *
 * GitHub Pages 처럼 서버를 둘 수 없는 곳에서도 원본 회원가입·로그인·세이브 흐름을 그대로 쓰기 위해,
 * 게임이 보내는 API 요청({@linkcode ApiBase.doFetch})을 이 모듈이 받아 IndexedDB 에 저장한다.
 *
 * - 계정, 비밀번호(PBKDF2 해시), 로그인 토큰, 시스템/세션 세이브를 모두 이 브라우저에 보관한다.
 * - 원본 서버와 같은 경로·응답 형식·오류 문구를 써서 원본 UI 가 그대로 동작한다.
 * - 다른 기기와는 공유되지 않는다 (진짜 서버가 아니므로).
 */

const DB_NAME = "math-pokerogue-server";
const STORE = "kv";

export const ERR_INVALID_USERNAME = "invalid username";
export const ERR_INVALID_PASSWORD = "invalid password";
export const ERR_USERNAME_IN_USE = "failed to add account record";
export const ERR_NO_ACCOUNT = "account doesn't exist";
export const ERR_PASSWORD_MISMATCH = "password doesn't match";

/** 아이디: 글자(한글 포함)·숫자·`_`·`-` 2~16자 */
const USERNAME_RE = /^[\p{L}\p{N}_-]{2,16}$/u;
const MIN_PASSWORD_LENGTH = 6;

interface StoredUser {
  username: string;
  salt: string;
  hash: string;
  registered: string;
  lastLoggedIn: string;
  lastSessionSlot: number;
}

// #region 저장소

interface KvStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  keys(prefix: string): Promise<string[]>;
}

class MemoryStore implements KvStore {
  private readonly map = new Map<string, unknown>();
  async get<T>(key: string) {
    return this.map.get(key) as T | undefined;
  }
  async set(key: string, value: unknown) {
    this.map.set(key, value);
  }
  async delete(key: string) {
    this.map.delete(key);
  }
  async keys(prefix: string) {
    return [...this.map.keys()].filter(k => k.startsWith(prefix));
  }
}

class IdbStore implements KvStore {
  private dbPromise: Promise<IDBDatabase> | undefined;

  private db(): Promise<IDBDatabase> {
    this.dbPromise ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.dbPromise;
  }

  private async run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  }

  get<T>(key: string) {
    return this.run<T | undefined>("readonly", s => s.get(key));
  }
  async set(key: string, value: unknown) {
    await this.run("readwrite", s => s.put(value, key));
  }
  async delete(key: string) {
    await this.run("readwrite", s => s.delete(key));
  }
  async keys(prefix: string) {
    const all = await this.run<IDBValidKey[]>("readonly", s => s.getAllKeys());
    return all.map(String).filter(k => k.startsWith(prefix));
  }
}

let store: KvStore | undefined;
function getStore(): KvStore {
  store ??= typeof indexedDB === "undefined" ? new MemoryStore() : new IdbStore();
  return store;
}

/** 테스트용: 메모리 저장소로 초기화 */
export function resetLocalServer(): void {
  store = new MemoryStore();
}

// #endregion

// #region 도구

function toHex(buf: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr);
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 100_000 },
    key,
    256,
  );
  return toHex(bits);
}

const userKey = (username: string) => `user:${username.toLowerCase()}`;
const systemKey = (username: string) => `system:${username.toLowerCase()}`;
const sessionKey = (username: string, slot: number | string) => `session:${username.toLowerCase()}:${slot}`;

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

/** 날짜(UTC)마다 같은 데일리 런 시드 */
export function dailySeedFor(date: Date): string {
  const day = date.toISOString().slice(0, 10);
  let h = 2166136261;
  let out = "";
  for (let i = 0; out.length < 24; i++) {
    h ^= day.charCodeAt(i % day.length) + i;
    h = Math.imul(h, 16777619) >>> 0;
    out += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[h % 62];
  }
  return out;
}

// #endregion

async function currentUser(authorization: string | undefined): Promise<StoredUser | undefined> {
  if (!authorization) {
    return;
  }
  const s = getStore();
  const username = await s.get<string>(`token:${authorization}`);
  return username ? s.get<StoredUser>(userKey(username)) : undefined;
}

/**
 * 게임의 API 요청 하나를 처리한다.
 * @param path - 예: `/account/login`, `/savedata/session/get?slot=0&...`
 */
export async function localServerFetch(
  path: string,
  init: { method: string; body?: BodyInit | null; headers?: Record<string, string | undefined> },
): Promise<Response> {
  const s = getStore();
  const url = new URL(path, "http://local");
  const route = url.pathname;
  const q = url.searchParams;
  const body = parseBody(init.body);
  const auth = init.headers?.Authorization;

  // #region 계정 (로그인 불필요)
  if (route === "/account/register") {
    const username = (body.username ?? "").trim();
    const password = body.password ?? "";
    if (!USERNAME_RE.test(username)) {
      return respond(ERR_INVALID_USERNAME, 400);
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return respond(ERR_INVALID_PASSWORD, 400);
    }
    if (await s.get(userKey(username))) {
      return respond(ERR_USERNAME_IN_USE, 400);
    }
    const salt = randomHex(16);
    const now = new Date().toISOString();
    const user: StoredUser = {
      username,
      salt,
      hash: await hashPassword(password, salt),
      registered: now,
      lastLoggedIn: now,
      lastSessionSlot: -1,
    };
    await s.set(userKey(username), user);
    return respond("");
  }

  if (route === "/account/login") {
    const username = (body.username ?? "").trim();
    const password = body.password ?? "";
    if (!USERNAME_RE.test(username)) {
      return respond(ERR_INVALID_USERNAME, 400);
    }
    if (!password) {
      return respond(ERR_INVALID_PASSWORD, 400);
    }
    const user = await s.get<StoredUser>(userKey(username));
    if (!user) {
      return respond(ERR_NO_ACCOUNT, 400);
    }
    if ((await hashPassword(password, user.salt)) !== user.hash) {
      return respond(ERR_PASSWORD_MISMATCH, 401);
    }
    const token = randomHex(32);
    await s.set(`token:${token}`, user.username);
    user.lastLoggedIn = new Date().toISOString();
    await s.set(userKey(user.username), user);
    return respond({ token });
  }

  if (route === "/game/titlestats") {
    return respond({ playerCount: (await s.keys("user:")).length, battleCount: 0 });
  }

  if (route === "/daily/seed") {
    return respond(dailySeedFor(new Date()));
  }
  // #endregion

  // #region 로그인 필요
  const user = await currentUser(auth);
  if (!user) {
    if (route === "/account/logout") {
      return respond("");
    }
    return respond("session not found", 401);
  }

  switch (route) {
    case "/account/info":
      return respond({
        username: user.username,
        lastSessionSlot: user.lastSessionSlot,
        discordId: "",
        googleId: "",
        hasAdminRole: false,
      });

    case "/account/logout":
      await s.delete(`token:${auth}`);
      return respond("");

    case "/account/changepw": {
      const password = body.password ?? "";
      if (password.length < MIN_PASSWORD_LENGTH) {
        return respond(ERR_INVALID_PASSWORD, 400);
      }
      user.salt = randomHex(16);
      user.hash = await hashPassword(password, user.salt);
      await s.set(userKey(user.username), user);
      return respond("");
    }

    case "/savedata/system/get": {
      const data = await s.get<string>(systemKey(user.username));
      return data ? respond(data) : respond("save does not exist", 404);
    }

    case "/savedata/system/verify":
      return respond({ valid: true, systemData: null });

    case "/savedata/system/update":
      await s.set(systemKey(user.username), String(init.body ?? ""));
      return respond("");

    case "/savedata/session/get": {
      const data = await s.get<string>(sessionKey(user.username, q.get("slot") ?? "0"));
      return data ? respond(data) : respond("save does not exist", 404);
    }

    case "/savedata/session/update": {
      const slot = Number(q.get("slot") ?? 0);
      await s.set(sessionKey(user.username, slot), String(init.body ?? ""));
      user.lastSessionSlot = slot;
      await s.set(userKey(user.username), user);
      return respond("");
    }

    case "/savedata/session/delete":
      await s.delete(sessionKey(user.username, q.get("slot") ?? "0"));
      return respond("");

    case "/savedata/session/clear":
      await s.delete(sessionKey(user.username, q.get("slot") ?? "0"));
      return respond({ success: true });

    case "/savedata/session/newclear":
      return respond(true);

    case "/savedata/updateall": {
      const raw = typeof init.body === "string" ? init.body : "";
      let parsed: { system?: unknown; session?: unknown; sessionSlotId?: number };
      try {
        parsed = JSON.parse(raw);
      } catch {
        return respond("invalid body", 400);
      }
      if (parsed.system) {
        await s.set(systemKey(user.username), JSON.stringify(parsed.system));
      }
      if (parsed.session && typeof parsed.sessionSlotId === "number") {
        await s.set(sessionKey(user.username, parsed.sessionSlotId), JSON.stringify(parsed.session));
        user.lastSessionSlot = parsed.sessionSlotId;
        await s.set(userKey(user.username), user);
      }
      return respond("");
    }
  }

  if (route.startsWith("/auth/")) {
    return respond("");
  }
  if (route.startsWith("/admin/")) {
    return respond("forbidden", 403);
  }
  // #endregion

  return respond("not found", 404);
}
