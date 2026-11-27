import {
  dailySeedFor,
  ERR_INVALID_PASSWORD,
  ERR_INVALID_USERNAME,
  ERR_NO_ACCOUNT,
  ERR_PASSWORD_MISMATCH,
  ERR_USERNAME_IN_USE,
  localServerFetch,
  resetLocalServer,
} from "#api/local-server";
import { beforeEach, describe, expect, it } from "vitest";

const form = (o: Record<string, string>) => new URLSearchParams(o).toString();
const post = (path: string, body: string, token?: string) =>
  localServerFetch(path, { method: "POST", body, headers: { Authorization: token } });
const get = (path: string, token?: string) =>
  localServerFetch(path, { method: "GET", headers: { Authorization: token } });

async function registerAndLogin(username = "피카츄짱", password = "pika1234") {
  await post("/account/register", form({ username, password }));
  const res = await post("/account/login", form({ username, password }));
  return ((await res.json()) as { token: string }).token;
}

describe("브라우저 계정 서버", () => {
  beforeEach(() => resetLocalServer());

  it("회원가입 → 로그인 → 내 정보", async () => {
    const reg = await post("/account/register", form({ username: "학생01", password: "abc123" }));
    expect(reg.ok).toBe(true);
    const login = await post("/account/login", form({ username: "학생01", password: "abc123" }));
    expect(login.ok).toBe(true);
    const { token } = await login.json();
    const info = await get("/account/info", token);
    expect(await info.json()).toMatchObject({ username: "학생01", lastSessionSlot: -1, hasAdminRole: false });
  });

  it("원본 UI 가 이해하는 오류 문구를 돌려준다", async () => {
    expect(await (await post("/account/register", form({ username: "a", password: "abc123" }))).text()).toBe(
      ERR_INVALID_USERNAME,
    );
    expect(await (await post("/account/register", form({ username: "abcd", password: "123" }))).text()).toBe(
      ERR_INVALID_PASSWORD,
    );
    await post("/account/register", form({ username: "abcd", password: "123456" }));
    expect(await (await post("/account/register", form({ username: "ABCD", password: "123456" }))).text()).toBe(
      ERR_USERNAME_IN_USE,
    );
    expect(await (await post("/account/login", form({ username: "nobody", password: "123456" }))).text()).toBe(
      ERR_NO_ACCOUNT,
    );
    const wrong = await post("/account/login", form({ username: "abcd", password: "999999" }));
    expect(wrong.status).toBe(401);
    expect(await wrong.text()).toBe(ERR_PASSWORD_MISMATCH);
  });

  it("로그인하지 않으면 세이브에 접근할 수 없다", async () => {
    expect((await get("/account/info")).status).toBe(401);
    expect((await get("/savedata/system/get", "fake")).status).toBe(401);
  });

  it("시스템/세션 세이브를 계정별로 저장·불러오기·삭제한다", async () => {
    const t1 = await registerAndLogin("유저1", "pass11");
    const t2 = await registerAndLogin("유저2", "pass22");
    expect((await get("/savedata/system/get", t1)).status).toBe(404);

    await post("/savedata/system/update?clientSessionId=x", '{"trainerId":1}', t1);
    expect(await (await get("/savedata/system/get", t1)).text()).toBe('{"trainerId":1}');
    expect((await get("/savedata/system/get", t2)).status).toBe(404);

    await post("/savedata/session/update?slot=2&clientSessionId=x", '{"waveIndex":7}', t1);
    expect(await (await get("/savedata/session/get?slot=2", t1)).text()).toBe('{"waveIndex":7}');
    expect((await (await get("/account/info", t1)).json()).lastSessionSlot).toBe(2);

    await post(
      "/savedata/updateall",
      JSON.stringify({ system: { trainerId: 5 }, session: { waveIndex: 9 }, sessionSlotId: 1, clientSessionId: "x" }),
      t1,
    );
    expect(await (await get("/savedata/system/get", t1)).text()).toBe('{"trainerId":5}');
    expect(await (await get("/savedata/session/get?slot=1", t1)).text()).toBe('{"waveIndex":9}');

    const cleared = await post("/savedata/session/clear?slot=1", "{}", t1);
    expect(await cleared.json()).toEqual({ success: true });
    expect(await (await get("/savedata/session/get?slot=1", t1)).text()).toBe("save does not exist");
  });

  it("로그아웃하면 토큰이 무효가 되고, 비밀번호를 바꿀 수 있다", async () => {
    const t = await registerAndLogin("바꿀사람", "old123");
    await post("/account/changepw", form({ password: "new456" }), t);
    await get("/account/logout", t);
    expect((await get("/account/info", t)).status).toBe(401);
    expect((await post("/account/login", form({ username: "바꿀사람", password: "old123" }))).status).toBe(401);
    expect((await post("/account/login", form({ username: "바꿀사람", password: "new456" }))).ok).toBe(true);
  });

  it("데일리 시드는 날짜마다 같고 24글자다", () => {
    const a = dailySeedFor(new Date("2026-11-27T01:00:00Z"));
    expect(a).toHaveLength(24);
    expect(dailySeedFor(new Date("2026-11-27T23:00:00Z"))).toBe(a);
    expect(dailySeedFor(new Date("2026-11-28T01:00:00Z"))).not.toBe(a);
  });
});
