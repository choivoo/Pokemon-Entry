/**
 * 학교 검색: 교육부 NEIS 교육정보 개방 포털의 "학교기본정보" API.
 * 학교 이름(과 지역)으로 찾고, 같은 이름의 학교는 지역·주소로 구분해서 고른다.
 * 인터넷이 안 되거나 NEIS 가 응답하지 않으면 학교 이름을 직접 입력할 수 있다.
 *
 * 실제 서버로 확인한 내용 (2026-11):
 *  - 응답은 JSON 이고 `Access-Control-Allow-Origin: *` 라서 웹사이트에서 바로 부를 수 있다.
 *  - 인증키 없이는 요청 한 번에 5개까지만 준다 (`pSize` 를 키워도 5개). 그래서 "더 보기"로 다음 쪽을 이어서 받는다.
 *  - 개교 전 학교는 학교 코드가 공백으로 온다 → 건너뛴다.
 */
import type { School } from "#app/edu/profile";

const ENDPOINT = "https://open.neis.go.kr/hub/schoolInfo";

export const neisHooks = { fetch: (url: string, init?: RequestInit) => fetch(url, init) };

/** 시도교육청 코드 (지역 선택용) */
export const NEIS_REGIONS: readonly (readonly [code: string, name: string])[] = [
  ["B10", "서울"],
  ["C10", "부산"],
  ["D10", "대구"],
  ["E10", "인천"],
  ["F10", "광주"],
  ["G10", "대전"],
  ["H10", "울산"],
  ["I10", "세종"],
  ["J10", "경기"],
  ["K10", "강원"],
  ["M10", "충북"],
  ["N10", "충남"],
  ["P10", "전북"],
  ["Q10", "전남"],
  ["R10", "경북"],
  ["S10", "경남"],
  ["T10", "제주"],
];

interface NeisRow {
  ATPT_OFCDC_SC_CODE?: string;
  ATPT_OFCDC_SC_NM?: string;
  SD_SCHUL_CODE?: string;
  SCHUL_NM?: string;
  SCHUL_KND_SC_NM?: string;
  LCTN_SC_NM?: string;
  ORG_RDNMA?: string;
}

export interface SchoolPage {
  schools: School[];
  /** 조건에 맞는 학교 전체 수 */
  total: number;
  /** 받은 쪽 번호 (1부터) */
  page: number;
  /** 이 쪽에서 서버가 돌려준 줄 수 (개교 전 학교 포함) */
  rows: number;
}

/** NEIS 응답(JSON)에서 학교 목록을 꺼낸다 */
export function parseNeisResponse(json: unknown): School[] {
  return parseNeisPage(json, 1).schools;
}

/** NEIS 응답(JSON)을 한 쪽 분량으로 바꾼다 */
export function parseNeisPage(json: unknown, page: number): SchoolPage {
  const root = json as { schoolInfo?: { head?: { list_total_count?: number }[]; row?: NeisRow[] }[] } | null;
  const info = root?.schoolInfo ?? [];
  const rows = info.find(x => Array.isArray(x.row))?.row ?? [];
  const total = Number(
    info.find(x => Array.isArray(x.head))?.head?.find(h => h.list_total_count !== undefined)?.list_total_count
      ?? rows.length,
  );
  const schools: School[] = [];
  for (const r of rows) {
    const name = r.SCHUL_NM?.trim();
    const school = r.SD_SCHUL_CODE?.trim();
    const office = r.ATPT_OFCDC_SC_CODE?.trim();
    if (!name || !school || !office) {
      continue; // 개교 전 학교처럼 코드가 비어 있으면 건너뛴다
    }
    schools.push({
      code: `${office}:${school}`,
      name,
      region: (r.LCTN_SC_NM ?? r.ATPT_OFCDC_SC_NM ?? "").trim(),
      address: shortAddress(r.ORG_RDNMA),
    });
  }
  return { schools, total: Number.isFinite(total) ? total : schools.length, page, rows: rows.length };
}

/** "서울특별시 종로구 ○○로 12 (동)" → "종로구 ○○로 12" */
export function shortAddress(addr: string | undefined): string {
  if (!addr) {
    return "";
  }
  return addr
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .slice(1, 4)
    .join(" ");
}

export class SchoolSearchError extends Error {}

export interface SearchOptions {
  /** 시도교육청 코드 (`NEIS_REGIONS`), 없으면 전국 */
  region?: string;
  /** 쪽 번호 (1부터) */
  page?: number;
  signal?: AbortSignal;
}

/**
 * 초등학교를 이름으로 검색한다.
 * @param query - 학교 이름의 일부 (2글자 이상)
 */
export async function searchSchools(query: string, opts: SearchOptions = {}): Promise<SchoolPage> {
  const q = query.trim();
  const page = Math.max(1, opts.page ?? 1);
  if (q.length < 2) {
    return { schools: [], total: 0, page, rows: 0 };
  }
  const key = import.meta.env.VITE_NEIS_KEY;
  const params = new URLSearchParams({
    Type: "json",
    pIndex: String(page),
    pSize: key ? "100" : "5",
    SCHUL_NM: q,
    SCHUL_KND_SC_NM: "초등학교",
  });
  if (opts.region) {
    params.set("ATPT_OFCDC_SC_CODE", opts.region);
  }
  if (key) {
    params.set("KEY", key);
  }
  let res: Response;
  try {
    res = await neisHooks.fetch(`${ENDPOINT}?${params}`, opts.signal ? { signal: opts.signal } : undefined);
  } catch {
    throw new SchoolSearchError("학교 검색 서버에 연결하지 못했어요.");
  }
  if (!res.ok) {
    throw new SchoolSearchError("학교 검색 서버가 응답하지 않아요.");
  }
  return parseNeisPage(await res.json(), page);
}

/** 직접 입력한 학교 (공백이 달라도 같은 학교로 묶는다) */
export function manualSchool(name: string, region = ""): School {
  const n = name.trim();
  return { code: `manual:${n.replace(/\s+/g, "")}`, name: n, region };
}
