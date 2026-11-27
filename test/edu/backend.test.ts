import { authHeaders, backend, isBackendOnline, isSafeUrl, isSecretKey } from "#app/edu/backend";
import { afterEach, describe, expect, it } from "vitest";

const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const jwt = (role: string) =>
  `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ iss: "supabase", role })}.${"s".repeat(30)}`;

describe("서버 연결 설정", () => {
  const real = { ...backend };
  afterEach(() => Object.assign(backend, real));

  it("주소: https 이거나 내 컴퓨터(localhost)만 안전하다", () => {
    expect(isSafeUrl("https://abc.supabase.co")).toBe(true);
    expect(isSafeUrl("http://localhost:8788")).toBe(true);
    expect(isSafeUrl("http://127.0.0.1:8788")).toBe(true);
    expect(isSafeUrl("http://abc.supabase.co")).toBe(false);
    expect(isSafeUrl("http://localhost.evil.com")).toBe(false);
    expect(isSafeUrl("")).toBe(false);
  });

  it("비밀 키(service_role, sb_secret_)는 알아보고 거부한다", () => {
    expect(isSecretKey(jwt("service_role"))).toBe(true);
    expect(isSecretKey("sb_secret_abcdefghijklmnopqrstuvwxyz")).toBe(true);
    expect(isSecretKey(jwt("anon"))).toBe(false);
    expect(isSecretKey("sb_publishable_abcdefghijklmnopqrstuvwxyz")).toBe(false);
    expect(isSecretKey("아무글자")).toBe(false);
  });

  it("공개 키만 있으면 서버가 켜지고, 비밀 키나 짧은 키·http 주소면 꺼진다", () => {
    backend.url = () => "https://abc.supabase.co";
    backend.key = () => jwt("anon");
    expect(isBackendOnline()).toBe(true);
    backend.key = () => "sb_publishable_abcdefghijklmnopqrstuvwxyz";
    expect(isBackendOnline()).toBe(true);
    backend.key = () => jwt("service_role");
    expect(isBackendOnline()).toBe(false);
    backend.key = () => "sb_secret_abcdefghijklmnopqrstuvwxyz";
    expect(isBackendOnline()).toBe(false);
    backend.key = () => "short";
    expect(isBackendOnline()).toBe(false);
    backend.key = () => jwt("anon");
    backend.url = () => "http://abc.supabase.co";
    expect(isBackendOnline()).toBe(false);
  });

  it("헤더: 예전 anon 키는 Authorization 도 보내고, 새 공개 키는 apikey 로만 보낸다", () => {
    backend.key = () => jwt("anon");
    expect(authHeaders()).toMatchObject({ apikey: jwt("anon"), Authorization: `Bearer ${jwt("anon")}` });
    backend.key = () => "sb_publishable_abcdefghijklmnopqrstuvwxyz";
    const h = authHeaders();
    expect(h.apikey).toBe("sb_publishable_abcdefghijklmnopqrstuvwxyz");
    expect(h).not.toHaveProperty("Authorization");
    expect(h["Content-Type"]).toBe("application/json");
  });
});
