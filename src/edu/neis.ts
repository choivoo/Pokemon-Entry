/**
 * 학교 검색: 교육부 NEIS 교육정보 개방 포털의 "학교기본정보" API.
 * 학교 이름으로 찾고, 같은 이름의 학교는 지역·주소로 구분해서 고른다.
 * 인터넷이 안 되거나 NEIS 가 응답하지 않으면 학교 이름을 직접 입력할 수 있다.
 */
import type { School } from "#app/edu/profile";

const ENDPOINT = "https://open.neis.go.kr/hub/schoolInfo";

export const neisHooks = { fetch: (url: string, init?: RequestInit) => fetch(url, init) };

interface NeisRow {
  ATPT_OFCDC_SC_CODE?: string;
  ATPT_OFCDC_SC_NM?: string;
  SD_SCHUL_CODE?: string;
  SCHUL_NM?: string;
  SCHUL_KND_SC_NM?: string;
  LCTN_SC_NM?: string;
  ORG_RDNMA?: string;
}

/** NEIS 응답(JSON)에서 학교 목록을 꺼낸다 */
export function parseNeisResponse(json: unknown): School[] {
  const root = json as { schoolInfo?: { row?: NeisRow[] }[] } | null;
  const rows = root?.schoolInfo?.find(x => Array.isArray(x.row))?.row ?? [];
  return rows
    .filter(r => r.SCHUL_NM && r.SD_SCHUL_CODE && r.ATPT_OFCDC_SC_CODE)
    .map(r => ({
      code: `${r.ATPT_OFCDC_SC_CODE}:${r.SD_SCHUL_CODE}`,
      name: r.SCHUL_NM as string,
      region: r.LCTN_SC_NM ?? r.ATPT_OFCDC_SC_NM ?? "",
      address: shortAddress(r.ORG_RDNMA),
    }));
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

/**
 * 초등학교를 이름으로 검색한다.
 * @param query - 학교 이름의 일부 (2글자 이상)
 */
export async function searchSchools(query: string, signal?: AbortSignal): Promise<School[]> {
  const q = query.trim();
  if (q.length < 2) {
    return [];
  }
  const params = new URLSearchParams({
    Type: "json",
    pIndex: "1",
    pSize: "30",
    SCHUL_NM: q,
    SCHUL_KND_SC_NM: "초등학교",
  });
  const key = import.meta.env.VITE_NEIS_KEY;
  if (key) {
    params.set("KEY", key);
  }
  let res: Response;
  try {
    res = await neisHooks.fetch(`${ENDPOINT}?${params}`, signal ? { signal } : undefined);
  } catch {
    throw new SchoolSearchError("학교 검색 서버에 연결하지 못했어요.");
  }
  if (!res.ok) {
    throw new SchoolSearchError("학교 검색 서버가 응답하지 않아요.");
  }
  return parseNeisResponse(await res.json());
}

/** 직접 입력한 학교 */
export function manualSchool(name: string, region = ""): School {
  const n = name.trim();
  return { code: `manual:${n}`, name: n, region };
}
