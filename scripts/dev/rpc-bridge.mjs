// 개발용: Supabase 대신 내 컴퓨터의 PostgreSQL 에 `supabase/schema.sql` 을 적용해 두고,
// 게임이 보내는 /rest/v1/rpc/* 요청을 그 데이터베이스의 함수로 전달하는 작은 서버입니다.
// 실제 배포에는 쓰지 않습니다. (서버 설정 없이 계정 동기화를 시험해 보는 용도)
//
//   node scripts/dev/rpc-bridge.mjs --port 8788 --socket /tmp/pg --pgport 5432 --db edutest
//   VITE_SUPABASE_URL=http://localhost:8788 VITE_SUPABASE_ANON_KEY=<아무 40글자 이상> pnpm start:pages
import { spawn } from "node:child_process";
import http from "node:http";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const PORT = Number(arg("port", 8788));
const SOCKET = arg("socket", "/var/run/postgresql");
const PGPORT = arg("pgport", "5432");
const DB = arg("db", "edutest");
const USER = arg("user", "postgres");

/** 함수 이름 → 인자 이름과 종류 */
const FUNCTIONS = {
  edu_register: [
    ["p_username", "text"],
    ["p_password", "text"],
  ],
  edu_login: [
    ["p_username", "text"],
    ["p_password", "text"],
  ],
  edu_logout: [["p_token", "text"]],
  edu_info: [["p_token", "text"]],
  edu_change_password: [
    ["p_token", "text"],
    ["p_password", "text"],
  ],
  edu_save_get: [
    ["p_token", "text"],
    ["p_kind", "text"],
    ["p_slot", "int"],
  ],
  edu_save_put: [
    ["p_token", "text"],
    ["p_kind", "text"],
    ["p_slot", "int"],
    ["p_data", "text"],
  ],
  edu_save_delete: [
    ["p_token", "text"],
    ["p_kind", "text"],
    ["p_slot", "int"],
  ],
  edu_save_all: [
    ["p_token", "text"],
    ["p_system", "text"],
    ["p_session", "text"],
    ["p_slot", "int"],
  ],
  edu_profile_put: [
    ["p_token", "text"],
    ["p_profile", "jsonb"],
  ],
  edu_submit_solve: [
    ["p_token", "text"],
    ["p_subject", "text"],
    ["p_points", "int"],
    ["p_wave", "int"],
    ["p_streak", "int"],
    ["p_perfect", "bool"],
  ],
  edu_player_count: [],
};

const lit = v => `'${String(v).replaceAll("'", "''").replaceAll("\0", "")}'`;

function sqlArg(value, kind) {
  if (value === null || value === undefined) {
    return "null";
  }
  if (kind === "int") {
    return String(Math.trunc(Number(value)));
  }
  if (kind === "bool") {
    return value ? "true" : "false";
  }
  if (kind === "jsonb") {
    return `${lit(JSON.stringify(value))}::jsonb`;
  }
  return lit(value);
}

function psql(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn("psql", [
      "-h",
      SOCKET,
      "-p",
      PGPORT,
      "-U",
      USER,
      "-d",
      DB,
      "-X",
      "-A",
      "-t",
      "-q",
      "-v",
      "ON_ERROR_STOP=1",
    ]);
    let out = "";
    let err = "";
    p.stdout.on("data", d => (out += d));
    p.stderr.on("data", d => (err += d));
    p.on("close", code => (code === 0 ? resolve(out.trim()) : reject(new Error(err.trim() || `psql ${code}`))));
    p.stdin.end(`set role anon;\n${sql}\n`);
  });
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, prefer",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

http
  .createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, cors).end();
      return;
    }
    const url = new URL(req.url, "http://x");
    const chunks = [];
    for await (const c of req) {
      chunks.push(c);
    }
    const body = Buffer.concat(chunks).toString();
    try {
      const m = url.pathname.match(/^\/rest\/v1\/rpc\/(\w+)$/);
      if (m && req.method === "POST") {
        const spec = FUNCTIONS[m[1]];
        if (!spec) {
          throw Object.assign(new Error("unknown function"), { status: 404 });
        }
        const args = body ? JSON.parse(body) : {};
        const call = `select public.${m[1]}(${spec.map(([n, k]) => sqlArg(args[n], k)).join(", ")})`;
        const out = await psql(`${call};`);
        if (process.env.BRIDGE_LOG) {
          console.log(m[1], out.slice(0, 80));
        }
        res.writeHead(200, { ...cors, "Content-Type": "application/json" }).end(out || "null");
        return;
      }
      if (url.pathname === "/rest/v1/scores" && req.method === "GET") {
        const where = [];
        for (const col of ["subject", "school_code", "grade", "class_name"]) {
          const v = url.searchParams.get(col);
          if (v?.startsWith("eq.")) {
            where.push(`${col} = ${col === "grade" ? Number(v.slice(3)) : lit(v.slice(3))}`);
          }
        }
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
        const out = await psql(
          `select coalesce(json_agg(t), '[]') from (select * from public.scores ${where.length > 0 ? `where ${where.join(" and ")}` : ""} order by points desc limit ${limit}) t;`,
        );
        res.writeHead(200, { ...cors, "Content-Type": "application/json" }).end(out);
        return;
      }
      res.writeHead(404, cors).end("not found");
    } catch (e) {
      res
        .writeHead(e.status ?? 400, { ...cors, "Content-Type": "application/json" })
        .end(JSON.stringify({ message: String(e.message) }));
    }
  })
  .listen(PORT, () => console.log(`rpc-bridge: http://localhost:${PORT} → ${DB} (${SOCKET}:${PGPORT})`));
