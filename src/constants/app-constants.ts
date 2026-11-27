/**
 * `true` if running in "development" mode which happens when:
 * - The build mode is "development" (`pnpm build:dev` which runs `vite build --mode development`) or
 * - The Vite server is started via `pnpm start:dev` (which runs `vite --mode development`)
 */
export const isDev = import.meta.env.MODE === "development";

/**
 * `true` if running in "beta" mode which happens when:
 * - The build mode is "beta" (`pnpm build:beta` which runs `vite build --mode beta`) or
 * - The Vite server is started via `pnpm start:beta` (which runs `vite --mode beta`)
 */
export const isBeta = import.meta.env.MODE === "beta";

/** `true` if running via "app" mode (`pnpm build:app` which runs `vite build --mode app`) */
export const isApp = import.meta.env.MODE === "app";

/** `true` if running automated tests via Vitest. */
export const IS_TEST = import.meta.env.MODE === "test";

export const bypassLogin = import.meta.env.VITE_BYPASS_LOGIN === "1";

/**
 * `true`이면 PokéRogue 서버 대신 브라우저 안의 계정 서버(회원가입·로그인·세이브를 IndexedDB에 저장)를 쓴다.
 * GitHub Pages 처럼 서버가 없는 곳에 배포할 때 사용한다.
 */
export const useLocalServer = import.meta.env.VITE_LOCAL_SERVER === "1";

/** The ratio at which PRSFX sound volumes are played is adjusted since they are sigificantly louder. */
export const PRSFX_SOUND_ADJUSTMENT_RATIO = 0.5;

/** The maximum number of language options to display simultaneously. */
export const LANGUAGE_MAX_OPTIONS = 7;

/** A map of condensed keynames to their associated full names. */
export const systemSaveShortKeyMap = {
  seenAttr: "$sa",
  caughtAttr: "$ca",
  natureAttr: "$na",
  seenCount: "$s",
  caughtCount: "$c",
  hatchedCount: "$hc",
  ivs: "$i",
  moveset: "$m",
  eggMoves: "$em",
  candyCount: "$x",
  friendship: "$f",
  abilityAttr: "$a",
  passiveAttr: "$pa",
  valueReduction: "$vr",
  classicWinCount: "$wc",
} as const;
