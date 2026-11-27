// 빌드 결과(dist)에 원본 에셋(assets 서브모듈)을 복사한다. GitHub Pages 배포용.
import { cpSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = "assets";
const DEST = "dist";
// 게임에서 쓰지 않는 저장소 관리용 파일
const SKIP = new Set([
  ".editorconfig",
  ".gitignore",
  ".gitkeep",
  "tsconfig.json",
  "vitest.config.ts",
  ".git",
  ".github",
  "LICENSES",
  "README.md",
  "REUSE.toml",
  "biome.jsonc",
  "lefthook.yml",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "test",
  "node_modules",
]);

if (!existsSync(join(SRC, "images"))) {
  console.error("assets 폴더가 비어 있습니다. 먼저 `git submodule update --init --recursive` 를 실행하세요.");
  process.exit(1);
}

let count = 0;
for (const entry of readdirSync(SRC)) {
  if (SKIP.has(entry) || entry.endsWith(".ts")) {
    continue;
  }
  cpSync(join(SRC, entry), join(DEST, entry), { recursive: true });
  count++;
}
// GitHub Pages 가 밑줄로 시작하는 파일을 무시하지 않도록
writeFileSync(join(DEST, ".nojekyll"), "");
console.log(`assets → dist 복사 완료 (${count}개 항목)`);
