/// <reference types="vite/client" />

// biome-ignore lint/style/useNamingConvention: HTTP and URL are fullcaps acronyms
type HTTP_URL = `http${"" | "s"}://${string}`;

// Declaration merging for vite's `import.meta.env`.

interface ImportMetaEnv {
  // TODO: There doesn't appear to be a way to override Vite's definition of MODE;
  // it still shows up as "string"...
  readonly MODE: "development" | "beta" | "production" | "test" | "app" | "pages";
  readonly VITE_PORT?: `${number}`;
  readonly VITE_BYPASS_LOGIN?: "0" | "1";
  readonly VITE_BYPASS_TUTORIAL?: "0" | "1";
  /** "1"이면 서버 대신 브라우저 안의 계정 서버(IndexedDB)를 쓴다 (GitHub Pages 배포용) */
  readonly VITE_LOCAL_SERVER?: "0" | "1";
  /** 랭킹 서버(Supabase) 주소와 공개(anon) 키. 비어 있으면 이 기기 기록만 보여 준다 */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** 학교 검색(NEIS 교육정보 개방 포털) 인증키. 없어도 동작한다(결과 수 제한) */
  readonly VITE_NEIS_KEY?: string;
  readonly VITE_API_BASE_URL?: HTTP_URL;
  readonly VITE_SERVER_URL?: HTTP_URL;
  readonly VITE_DISCORD_CLIENT_ID?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_I18N_DEBUG?: "0" | "1";
  readonly VITE_WIKI_URL: string;
  readonly VITE_DISCORD_URL: string;
  readonly VITE_GITHUB_URL: string;
  readonly VITE_REDDIT_URL: string;
  readonly VITE_DONATE_URL: string;
}

// tell vite to disallow missing env vars
interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}
