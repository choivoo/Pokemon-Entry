import { localServerFetch, resetLocalServer } from "#api/local-server";
import { remoteServerFetch } from "#api/remote-server";
import { SESSION_ID_COOKIE_NAME } from "#app/constants";
import { backend } from "#app/edu/backend";
import {
  clearActiveProfile,
  DEFAULT_PROFILE,
  getActiveProfile,
  type LearnerProfile,
  loadProfile,
  setActiveProfile,
} from "#app/edu/profile";
import { flushQueue, loadQueue, pendingPoints, queueHooks, SUBMIT_GAP_MS, submitSolve } from "#app/edu/ranking";
import { getUid, loadStats, recordSolve } from "#app/edu/stats";
import { applyAccountData } from "#app/edu/sync";
import { removeCookie, setCookie } from "#utils/cookies";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

/** 서버 함수(`edu_*`)를 흉내 내는 가짜 서버 — 요청 변환 확인용. 진짜 SQL 은 test/edu/sql 에서 검사한다. */
class FakeServer {
  users = new Map<string, { id: string; username: string; password: string; slot: number; profile: Row | null }>();
  tokens = new Map<string, string>();
  saves = new Map<string, string>();
  scores: Row[] = [];
  calls: { fn: string; args: Row }[] = [];
  down = false;
  tooFast = 0;

  fetch = async (url: string, init?: RequestInit): Promise<Response> => {
    if (this.down) {
      throw new TypeError("Failed to fetch");
    }
    const fn = url.split("/rpc/")[1];
    const args = JSON.parse(String(init?.body ?? "{}")) as Row;
    this.calls.push({ fn, args });
    return new Response(
      JSON.stringify(
        this[fn as keyof FakeServer]
          ? (this as never as Record<string, (a: Row) => unknown>)[fn](args)
          : { ok: false, error: "no fn" },
      ),
      { status: 200 },
    );
  };

  private user(a: Row) {
    const id = this.tokens.get(String(a.p_token));
    return id ? [...this.users.values()].find(u => u.id === id) : undefined;
  }
  edu_register = (a: Row) => {
    const name = String(a.p_username);
    if (!/^[\p{L}\p{N}_-]{2,16}$/u.test(name)) {
      return { ok: false, error: "invalid username" };
    }
    if (String(a.p_password).length < 6) {
      return { ok: false, error: "invalid password" };
    }
    if (this.users.has(name.toLowerCase())) {
      return { ok: false, error: "failed to add account record" };
    }
    this.users.set(name.toLowerCase(), {
      id: `uid${this.users.size}000000`,
      username: name,
      password: String(a.p_password),
      slot: -1,
      profile: null,
    });
    return { ok: true };
  };
  edu_login = (a: Row) => {
    const u = this.users.get(String(a.p_username).toLowerCase());
    if (!u) {
      return { ok: false, error: "account doesn't exist" };
    }
    if (u.password !== a.p_password) {
      return { ok: false, error: "password doesn't match" };
    }
    const token = `token-${this.tokens.size}`;
    this.tokens.set(token, u.id);
    return { ok: true, token };
  };
  edu_logout = (a: Row) => {
    this.tokens.delete(String(a.p_token));
    return { ok: true };
  };
  edu_info = (a: Row) => {
    const u = this.user(a);
    return u
      ? {
          ok: true,
          uid: u.id,
          username: u.username,
          last_session_slot: u.slot,
          profile: u.profile,
          scores: this.scores.filter(s => s.uid === u.id),
        }
      : { ok: false, error: "session not found" };
  };
  edu_change_password = (a: Row) => {
    const u = this.user(a);
    if (!u) {
      return { ok: false, error: "session not found" };
    }
    u.password = String(a.p_password);
    return { ok: true };
  };
  edu_save_get = (a: Row) => {
    const u = this.user(a);
    if (!u) {
      return { ok: false, error: "session not found" };
    }
    const d = this.saves.get(`${u.id}|${a.p_kind}|${a.p_slot}`);
    return d === undefined ? { ok: false, error: "save does not exist" } : { ok: true, data: d };
  };
  edu_save_put = (a: Row) => {
    const u = this.user(a);
    if (!u) {
      return { ok: false, error: "session not found" };
    }
    this.saves.set(`${u.id}|${a.p_kind}|${a.p_slot}`, String(a.p_data));
    if (a.p_kind === "session") {
      u.slot = Number(a.p_slot);
    }
    return { ok: true };
  };
  edu_save_delete = (a: Row) => {
    const u = this.user(a);
    if (!u) {
      return { ok: false, error: "session not found" };
    }
    this.saves.delete(`${u.id}|${a.p_kind}|${a.p_slot}`);
    return { ok: true };
  };
  edu_save_all = (a: Row) => {
    const u = this.user(a);
    if (!u) {
      return { ok: false, error: "session not found" };
    }
    if (a.p_system) {
      this.saves.set(`${u.id}|system|0`, String(a.p_system));
    }
    if (a.p_session) {
      this.saves.set(`${u.id}|session|${a.p_slot}`, String(a.p_session));
      u.slot = Number(a.p_slot);
    }
    return { ok: true };
  };
  edu_profile_put = (a: Row) => {
    const u = this.user(a);
    if (!u) {
      return { ok: false, error: "session not found" };
    }
    u.profile = a.p_profile as Row;
    return { ok: true };
  };
  edu_submit_solve = (a: Row) => {
    const u = this.user(a);
    if (!u) {
      return { ok: false, error: "session not found" };
    }
    if (this.tooFast > 0) {
      this.tooFast--;
      return { ok: false, error: "too fast" };
    }
    if (!u.profile || u.profile.rankingConsent !== true) {
      return { ok: false, error: "consent required" };
    }
    const row = this.scores.find(s => s.uid === u.id && s.subject === a.p_subject);
    if (row) {
      row.points = Number(row.points) + Number(a.p_points);
      row.solved = Number(row.solved) + 1;
    } else {
      this.scores.push({
        uid: u.id,
        subject: a.p_subject,
        points: a.p_points,
        solved: 1,
        perfect: a.p_perfect ? 1 : 0,
        best_wave: Number(a.p_wave) + 1,
        best_streak: a.p_streak,
      });
    }
    return { ok: true };
  };
  edu_player_count = () => ({ playerCount: this.users.size });
}

const form = (o: Record<string, string>) => new URLSearchParams(o).toString();
const call = (path: string, init: { method?: string; body?: string; token?: string } = {}) =>
  remoteServerFetch(path, {
    method: init.method ?? "GET",
    body: init.body ?? null,
    headers: { Authorization: init.token },
  });

const profile = (over: Partial<LearnerProfile> = {}): LearnerProfile => ({
  ...DEFAULT_PROFILE,
  subject: "kor",
  grade: 5,
  school: { code: "T10:1", name: "테스트초등학교", region: "" },
  className: "여울반",
  studentNo: 6,
  rankingConsent: true,
  ...over,
});

describe("서버 계정 (기기 사이 동기화)", () => {
  let server: FakeServer;
  const real = { ...backend };
  const realWait = queueHooks.wait;

  beforeEach(() => {
    localStorage.clear();
    clearActiveProfile();
    removeCookie(SESSION_ID_COOKIE_NAME);
    server = new FakeServer();
    backend.fetch = server.fetch as typeof backend.fetch;
    backend.url = () => "https://example.supabase.co";
    backend.key = () => "k".repeat(40);
    queueHooks.wait = async () => {};
  });
  afterEach(() => {
    Object.assign(backend, real);
    queueHooks.wait = realWait;
    removeCookie(SESSION_ID_COOKIE_NAME);
  });

  const login = async (name = "학생01", pw = "abc123") => {
    await call("/account/register", { method: "POST", body: form({ username: name, password: pw }) });
    const res = await call("/account/login", { method: "POST", body: form({ username: name, password: pw }) });
    const { token } = (await res.json()) as { token: string };
    setCookie(SESSION_ID_COOKIE_NAME, token);
    return token;
  };

  it("회원가입 · 로그인 · 내 정보: 원본 서버와 같은 응답과 오류 문구", async () => {
    expect(
      (await call("/account/register", { method: "POST", body: form({ username: "학생01", password: "abc123" }) })).ok,
    ).toBe(true);
    expect(
      await (
        await call("/account/register", { method: "POST", body: form({ username: "학생01", password: "abc123" }) })
      ).text(),
    ).toBe("failed to add account record");
    expect(
      await (
        await call("/account/register", { method: "POST", body: form({ username: "a", password: "abc123" }) })
      ).text(),
    ).toBe("invalid username");
    expect(
      await (
        await call("/account/register", { method: "POST", body: form({ username: "abcd", password: "1" }) })
      ).text(),
    ).toBe("invalid password");
    expect(
      await (
        await call("/account/login", { method: "POST", body: form({ username: "nobody", password: "abc123" }) })
      ).text(),
    ).toBe("account doesn't exist");
    const wrong = await call("/account/login", {
      method: "POST",
      body: form({ username: "학생01", password: "xxxxxx" }),
    });
    expect(wrong.status).toBe(401);
    expect(await wrong.text()).toBe("password doesn't match");
    const token = await login("친구", "pass12");
    const info = await call("/account/info", { token });
    expect(await info.json()).toMatchObject({ username: "친구", lastSessionSlot: -1, hasAdminRole: false });
    expect((await call("/account/info", { token: "fake" })).status).toBe(401);
  });

  it("세이브: 한 기기에서 저장하면 다른 기기(새 로그인)에서 그대로 불러온다", async () => {
    const tokenA = await login();
    await call("/savedata/system/update", { method: "POST", body: '{"trainerId":1}', token: tokenA });
    await call("/savedata/session/update?slot=2", { method: "POST", body: '{"waveIndex":7}', token: tokenA });
    await call("/savedata/updateall", {
      method: "POST",
      body: JSON.stringify({ system: { trainerId: 5 }, session: { waveIndex: 9 }, sessionSlotId: 1 }),
      token: tokenA,
    });
    // 다른 기기: 같은 계정으로 다시 로그인
    const res = await call("/account/login", {
      method: "POST",
      body: form({ username: "학생01", password: "abc123" }),
    });
    const tokenB = ((await res.json()) as { token: string }).token;
    expect(tokenB).not.toBe(tokenA);
    expect(await (await call("/savedata/system/get", { token: tokenB })).text()).toBe('{"trainerId":5}');
    expect(await (await call("/savedata/session/get?slot=2", { token: tokenB })).text()).toBe('{"waveIndex":7}');
    expect(await (await call("/savedata/session/get?slot=1", { token: tokenB })).text()).toBe('{"waveIndex":9}');
    expect((await (await call("/account/info", { token: tokenB })).json()).lastSessionSlot).toBe(1);
    expect((await call("/savedata/session/get?slot=5", { token: tokenB })).status).toBe(404);
    expect(
      await (await call("/savedata/session/clear?slot=1", { method: "POST", body: "{}", token: tokenB })).json(),
    ).toEqual({ success: true });
    expect((await call("/savedata/session/get?slot=1", { token: tokenB })).status).toBe(404);
    await call("/account/logout", { token: tokenB });
    expect((await call("/account/info", { token: tokenB })).status).toBe(401);
  });

  it("서버가 꺼져 있으면 게임이 알 수 있게 예외를 던진다", async () => {
    server.down = true;
    await expect(
      call("/account/login", { method: "POST", body: form({ username: "a1", password: "abc123" }) }),
    ).rejects.toThrow("서버에 연결하지 못했어요");
  });

  it("다른 기기에서 로그인하면 학습 설정과 점수가 따라온다", async () => {
    // 기기 A
    const tokenA = await login();
    setActiveProfile("학생01", profile({ units: ["반대말"] }));
    await vi.waitFor(() => expect(server.calls.some(c => c.fn === "edu_profile_put")).toBe(true));
    await submitSolve("학생01", profile(), { subject: "kor", points: 40, wave: 4, streak: 2, perfect: true });
    expect(server.scores).toHaveLength(1);
    expect(tokenA).toBeTruthy();

    // 기기 B: 이 브라우저에는 아무것도 없다
    localStorage.clear();
    clearActiveProfile();
    const res = await call("/account/login", {
      method: "POST",
      body: form({ username: "학생01", password: "abc123" }),
    });
    const tokenB = ((await res.json()) as { token: string }).token;
    setCookie(SESSION_ID_COOKIE_NAME, tokenB);
    expect(getActiveProfile("학생01")).toBeNull();
    await call("/account/info", { token: tokenB });
    expect(getActiveProfile("학생01")).toMatchObject({
      subject: "kor",
      grade: 5,
      className: "여울반",
      studentNo: 6,
      units: ["반대말"],
    });
    expect(loadProfile("학생01")?.school?.name).toBe("테스트초등학교");
    expect(loadStats("학생01").kor).toMatchObject({ points: 40, solved: 1, bestWave: 5, bestStreak: 2 });
    expect(getUid()).toBe("uid0000000");
  });

  it("서버에 설정이 없으면 이 기기의 설정을 서버로 올린다", async () => {
    localStorage.setItem("pkr_edu_profile:학생01", JSON.stringify(profile({ grade: 3 })));
    const token = await login();
    await call("/account/info", { token });
    await vi.waitFor(() => expect(server.users.get("학생01")?.profile).toMatchObject({ grade: 3 }));
  });

  it("점수 올리기: 랭킹 동의가 없으면 서버를 부르지 않는다", async () => {
    await login();
    server.calls.length = 0;
    expect(
      await submitSolve("학생01", profile({ rankingConsent: false }), {
        subject: "math",
        points: 20,
        wave: 1,
        streak: 0,
        perfect: false,
      }),
    ).toBe(false);
    expect(
      await submitSolve("학생01", profile({ school: null }), {
        subject: "math",
        points: 20,
        wave: 1,
        streak: 0,
        perfect: false,
      }),
    ).toBe(false);
    expect(server.calls).toHaveLength(0);
    expect(loadQueue("학생01")).toHaveLength(0);
  });

  it("점수 올리기: 값을 서버 한도에 맞춰 보내고, 열쇠는 쿠키에서 읽는다", async () => {
    await login();
    setActiveProfile("학생01", profile());
    server.calls.length = 0;
    await submitSolve("학생01", profile(), { subject: "eng", points: 9999, wave: 12, streak: 3, perfect: true });
    const sent = server.calls.find(c => c.fn === "edu_submit_solve")!.args;
    expect(sent).toMatchObject({ p_subject: "eng", p_points: 250, p_wave: 12, p_streak: 3, p_perfect: true });
    expect(String(sent.p_token)).toMatch(/^token-/);
  });

  it("서버가 너무 빠르다고 하면 대기열에 두고 간격을 두고 다시 올린다", async () => {
    await login();
    setActiveProfile("학생01", profile());
    server.tooFast = 2;
    const waits: number[] = [];
    const wait = async (ms: number) => {
      waits.push(ms);
    };
    // 두 번 거절당한 뒤 성공
    localStorage.setItem(
      "pkr_edu_queue:학생01",
      JSON.stringify([{ subject: "math", points: 30, wave: 1, streak: 1, perfect: true }]),
    );
    await flushQueue("학생01", wait);
    expect(loadQueue("학생01")).toHaveLength(0);
    expect(waits.every(ms => ms === SUBMIT_GAP_MS)).toBe(true);
    expect(waits.length).toBeGreaterThanOrEqual(3);
    expect(server.scores[0].points).toBe(30);
  });

  it("인터넷이 끊기면 점수가 대기열에 남고, 연결되면 올라간다 (점수는 서버 값 + 대기 점수로 보인다)", async () => {
    await login();
    setActiveProfile("학생01", profile());
    server.down = true;
    expect(
      await submitSolve("학생01", profile(), { subject: "math", points: 50, wave: 2, streak: 1, perfect: true }),
    ).toBe(false);
    expect(loadQueue("학생01")).toHaveLength(1);
    expect(pendingPoints("학생01", "math")).toBe(50);
    recordSolve("학생01", { subject: "math", points: 50, wave: 2, streak: 1, perfect: true });
    // 서버에는 이미 70점이 있다고 하자 → 화면의 점수 = 70 + 아직 못 올린 50
    applyAccountData("학생01", {
      uid: "uid1",
      profile: null,
      scores: [{ subject: "math", points: 70, solved: 3, best_wave: 4, best_streak: 2 }],
    });
    expect(loadStats("학생01").math).toMatchObject({ points: 120, solved: 3, bestWave: 4 });
    server.down = false;
    await flushQueue("학생01", async () => {});
    expect(loadQueue("학생01")).toHaveLength(0);
  });

  it("서버가 거절하는 기록(동의 없음 등)은 대기열에서 빼서 계속 재시도하지 않는다", async () => {
    await login();
    server.users.get("학생01")!.profile = { rankingConsent: false };
    localStorage.setItem(
      "pkr_edu_queue:학생01",
      JSON.stringify([{ subject: "math", points: 30, wave: 1, streak: 1, perfect: true }]),
    );
    await flushQueue("학생01", async () => {});
    expect(loadQueue("학생01")).toHaveLength(0);
    expect(server.scores).toHaveLength(0);
  });

  describe("서버를 연결하기 전에 이 기기에서 만든 계정", () => {
    const localPost = (path: string, body: Record<string, string>, token?: string) =>
      localServerFetch(path, {
        method: "POST",
        body: new URLSearchParams(body).toString(),
        headers: { Authorization: token },
      });

    beforeEach(() => resetLocalServer());

    it("같은 아이디·비밀번호로 로그인하면 서버로 옮겨지고, 세이브도 따라온다", async () => {
      await localPost("/account/register", { username: "옛학생", password: "old1234" });
      const lt = (
        (await (await localPost("/account/login", { username: "옛학생", password: "old1234" })).json()) as {
          token: string;
        }
      ).token;
      await localServerFetch("/savedata/system/update", {
        method: "POST",
        body: '{"trainerId":9}',
        headers: { Authorization: lt },
      });
      await localServerFetch("/savedata/session/update?slot=3", {
        method: "POST",
        body: '{"waveIndex":21}',
        headers: { Authorization: lt },
      });
      expect(server.users.size).toBe(0);

      const res = await call("/account/login", {
        method: "POST",
        body: form({ username: "옛학생", password: "old1234" }),
      });
      expect(res.ok).toBe(true);
      const token = ((await res.json()) as { token: string }).token;
      expect(server.users.get("옛학생")).toBeDefined();
      expect(await (await call("/savedata/system/get", { token })).text()).toBe('{"trainerId":9}');
      expect(await (await call("/savedata/session/get?slot=3", { token })).text()).toBe('{"waveIndex":21}');
      expect((await (await call("/account/info", { token })).json()).lastSessionSlot).toBe(3);
      // 다음부터는 평소처럼 서버 계정으로 로그인
      const before = server.calls.filter(c => c.fn === "edu_register").length;
      expect(
        (await call("/account/login", { method: "POST", body: form({ username: "옛학생", password: "old1234" }) })).ok,
      ).toBe(true);
      expect(server.calls.filter(c => c.fn === "edu_register").length).toBe(before);
    });

    it("비밀번호가 틀리면 옮기지 않고, 이 기기에 없는 아이디도 옮기지 않는다", async () => {
      await localPost("/account/register", { username: "옛학생", password: "old1234" });
      const wrong = await call("/account/login", {
        method: "POST",
        body: form({ username: "옛학생", password: "wrong99" }),
      });
      expect(wrong.status).toBe(400);
      expect(await wrong.text()).toBe("account doesn't exist");
      expect(server.users.size).toBe(0);
      expect(
        (await call("/account/login", { method: "POST", body: form({ username: "없는학생", password: "abc123" }) }))
          .status,
      ).toBe(400);
      expect(server.users.size).toBe(0);
    });

    it("서버에 같은 이름의 다른 계정이 이미 있으면 옮기지 않고 서버의 비밀번호만 따른다", async () => {
      await localPost("/account/register", { username: "옛학생", password: "old1234" });
      await call("/account/register", { method: "POST", body: form({ username: "옛학생", password: "serverpw1" }) });
      const res = await call("/account/login", {
        method: "POST",
        body: form({ username: "옛학생", password: "old1234" }),
      });
      expect(res.status).toBe(401); // 서버 계정의 비밀번호와 다르다
    });
  });

  it("플레이어 수와 데일리 시드", async () => {
    await login();
    expect(await (await call("/game/titlestats")).json()).toEqual({ playerCount: 1, battleCount: 0 });
    expect((await (await call("/daily/seed")).text()).length).toBe(24);
  });
});
