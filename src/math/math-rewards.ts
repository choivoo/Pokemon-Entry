/**
 * 수학 포켓로그: 문제를 맞혔을 때 받는 보상 목록 (500종 이상).
 *
 * 원본 게임의 아이템 데이터(기술머신, 민트, 테라피스, 나무열매, 진화 아이템, 폼체인지 아이템, 지닌 도구 등)를
 * 그대로 읽어서 보상 목록을 만들고, 여기에 돈·몬스터볼 꾸러미·아이템 선택 찬스·룰렛권을 더한다.
 */

import { EvolutionItem } from "#balance/pokemon-evolutions";
import { tmPoolTiers } from "#balance/tm-pool-tiers";
import { modifierTypes } from "#data/data-lists";
import { BerryType } from "#enums/berry-type";
import { FormChangeItem } from "#enums/form-change-item";
import { ModifierPoolType } from "#enums/modifier-pool-type";
import { ModifierTier } from "#enums/modifier-tier";
import { Nature } from "#enums/nature";
import { PokeballType } from "#enums/pokeball";
import { PokemonType } from "#enums/pokemon-type";
import { PERMANENT_STATS, TEMP_BATTLE_STATS } from "#enums/stat";
import type { PlayerPokemon } from "#field/pokemon";
import {
  type ModifierType,
  ModifierTypeGenerator,
  PokemonModifierType,
  SpeciesStatBoosterModifierTypeGenerator,
} from "#modifiers/modifier-type";
import type { ModifierTypeFunc } from "#types/modifier-types";

/** 보상 등급 (원본 아이템 등급과 같은 색) */
export type RewardRarity =
  | ModifierTier.COMMON
  | ModifierTier.GREAT
  | ModifierTier.ULTRA
  | ModifierTier.ROGUE
  | ModifierTier.MASTER;
export const RARITIES: readonly RewardRarity[] = [
  ModifierTier.COMMON,
  ModifierTier.GREAT,
  ModifierTier.ULTRA,
  ModifierTier.ROGUE,
  ModifierTier.MASTER,
];

/** 보상 분류 (뽑을 때 분류를 먼저 고르므로 기술머신만 잔뜩 나오지 않는다) */
export type RewardCategory =
  | "tm"
  | "mint"
  | "teraShard"
  | "berry"
  | "typeBooster"
  | "vitamin"
  | "battleItem"
  | "speciesItem"
  | "evolution"
  | "formChange"
  | "item"
  | "balls"
  | "money"
  | "shop"
  | "roulette";

export type RewardDef =
  | { id: string; rarity: RewardRarity; category: RewardCategory; kind: "item"; key: string; args?: unknown[] }
  | { id: string; rarity: RewardRarity; category: "balls"; kind: "balls"; ball: PokeballType; count: number }
  | { id: string; rarity: RewardRarity; category: "money"; kind: "money"; multiplier: number }
  | { id: string; rarity: RewardRarity; category: "shop"; kind: "shop"; tiers: ModifierTier[] }
  | { id: string; rarity: RewardRarity; category: "roulette"; kind: "roulette"; spins: number; jackpot: boolean };

/** 원본 아이템 목록 중 보상에서 뺄 것 (적 전용, 이상한 만남 전용, 특수 진행 아이템) */
const EXCLUDED_KEYS = new Set([
  "EVOLUTION_TRACKER_GIMMIGHOUL",
  "MEGA_BRACELET",
  "DYNAMAX_BAND",
  "TERA_ORB",
  "MAP",
  "GOLDEN_POKEBALL",
  "SILVER_POKEBALL",
  "MINI_BLACK_HOLE",
  "LOCK_CAPSULE",
]);

/** 개별로 펼쳐서 넣는 생성기 아이템 (나머지 생성기는 빼고, 일반 아이템은 그대로 넣는다) */
const GENERATOR_KEYS = new Set([
  "TM_COMMON",
  "TM_GREAT",
  "TM_ULTRA",
  "MINT",
  "TERA_SHARD",
  "BERRY",
  "ATTACK_TYPE_BOOSTER",
  "BASE_STAT_BOOSTER",
  "TEMP_STAT_STAGE_BOOSTER",
  "SPECIES_STAT_BOOSTER",
  "RARE_SPECIES_STAT_BOOSTER",
  "EVOLUTION_ITEM",
  "RARE_EVOLUTION_ITEM",
  "FORM_CHANGE_ITEM",
  "RARE_FORM_CHANGE_ITEM",
]);

const SPECIES_ITEMS = ["LIGHT_BALL", "THICK_CLUB", "METAL_POWDER", "QUICK_POWDER", "DEEP_SEA_SCALE", "DEEP_SEA_TOOTH"];

const enumValues = (e: Record<string, string | number>): number[] =>
  Object.values(e).filter((v): v is number => typeof v === "number");

const clampRarity = (tier: number): RewardRarity => Math.min(Math.max(tier, 0), ModifierTier.MASTER) as RewardRarity;

const getFunc = (key: string): ModifierTypeFunc | undefined => (modifierTypes as Record<string, ModifierTypeFunc>)[key];

let catalog: RewardDef[] | undefined;

/** 보상 목록 전체 (처음 부를 때 한 번 만든다) */
export function getRewardCatalog(): RewardDef[] {
  if (catalog) {
    return catalog;
  }
  const list: RewardDef[] = [];
  const item = (category: RewardCategory, rarity: number, key: string, args?: unknown[]) => {
    const id = args ? `${key}:${args.join(",")}` : key;
    list.push(
      args
        ? { id, rarity: clampRarity(rarity), category, kind: "item", key, args }
        : { id, rarity: clampRarity(rarity), category, kind: "item", key },
    );
  };

  // 기술머신 (원본 기술머신 등급 그대로)
  for (const [move, tier] of Object.entries(tmPoolTiers)) {
    const key = tier === ModifierTier.COMMON ? "TM_COMMON" : tier === ModifierTier.GREAT ? "TM_GREAT" : "TM_ULTRA";
    item("tm", tier, key, [Number(move)]);
  }
  // 민트 (성격 25가지)
  for (const nature of enumValues(Nature)) {
    item("mint", ModifierTier.ULTRA, "MINT", [nature]);
  }
  // 테라피스 (스텔라 포함)
  for (const type of enumValues(PokemonType).filter(t => t >= 0)) {
    item("teraShard", ModifierTier.GREAT, "TERA_SHARD", [type]);
  }
  // 타입 강화 도구 (18타입)
  for (const type of enumValues(PokemonType).filter(t => t >= 0 && t !== PokemonType.STELLAR)) {
    item("typeBooster", ModifierTier.ULTRA, "ATTACK_TYPE_BOOSTER", [type]);
  }
  // 나무열매
  for (const berry of enumValues(BerryType)) {
    item("berry", ModifierTier.COMMON, "BERRY", [berry]);
  }
  // 영양제 (HP업, 타우린 등)
  for (const stat of PERMANENT_STATS) {
    item("vitamin", ModifierTier.GREAT, "BASE_STAT_BOOSTER", [stat]);
  }
  // 배틀 아이템 (플러스파워 등)
  for (const stat of TEMP_BATTLE_STATS) {
    item("battleItem", ModifierTier.COMMON, "TEMP_STAT_STAGE_BOOSTER", [stat]);
  }
  // 전용 도구 (전기구슬 등)
  for (const key of SPECIES_ITEMS) {
    item("speciesItem", ModifierTier.ULTRA, "SPECIES_STAT_BOOSTER", [key]);
  }
  // 진화 아이템
  for (const evo of enumValues(EvolutionItem).filter(v => v !== EvolutionItem.NONE)) {
    item(
      "evolution",
      evo >= EvolutionItem.BLACK_AUGURITE || evo <= EvolutionItem.LINKING_CORD
        ? ModifierTier.ROGUE
        : ModifierTier.ULTRA,
      "EVOLUTION_ITEM",
      [evo],
    );
  }
  // 폼체인지 아이템 (메가스톤 등)
  for (const form of enumValues(FormChangeItem).filter(v => v !== FormChangeItem.NONE)) {
    item("formChange", ModifierTier.ROGUE, "FORM_CHANGE_ITEM", [form]);
  }
  // 그 밖의 원본 아이템 전부 (상처약, 학습장치, 먹다남은음식, 행복의알 ...)
  for (const key of Object.keys(modifierTypes)) {
    if (
      GENERATOR_KEYS.has(key)
      || EXCLUDED_KEYS.has(key)
      || key.startsWith("ENEMY_")
      || key.startsWith("MYSTERY_ENCOUNTER_")
    ) {
      continue;
    }
    const func = getFunc(key);
    let type: ModifierType | undefined;
    try {
      type = func?.();
    } catch {
      continue;
    }
    if (!type || type instanceof ModifierTypeGenerator) {
      continue;
    }
    item("item", type.withIdFromFunc(func!).getOrInferTier(ModifierPoolType.PLAYER) ?? ModifierTier.GREAT, key);
  }

  // 몬스터볼 꾸러미
  const ballRarity = [
    ModifierTier.COMMON,
    ModifierTier.GREAT,
    ModifierTier.ULTRA,
    ModifierTier.ROGUE,
    ModifierTier.MASTER,
  ];
  for (const ball of [
    PokeballType.POKEBALL,
    PokeballType.GREAT_BALL,
    PokeballType.ULTRA_BALL,
    PokeballType.ROGUE_BALL,
    PokeballType.MASTER_BALL,
  ]) {
    for (const [i, count] of [1, 2, 3, 5, 10].entries()) {
      const rarity = clampRarity(ballRarity[ball] + (i >= 3 ? 1 : 0));
      list.push({ id: `balls:${ball}:${count}`, rarity, category: "balls", kind: "balls", ball, count });
    }
  }
  // 돈 (그 층의 기본 상금 × 배수)
  for (const [multiplier, rarity] of [
    [1, ModifierTier.COMMON],
    [2, ModifierTier.COMMON],
    [3, ModifierTier.GREAT],
    [4, ModifierTier.GREAT],
    [5, ModifierTier.ULTRA],
    [7, ModifierTier.ULTRA],
    [10, ModifierTier.ROGUE],
    [20, ModifierTier.MASTER],
  ] as const) {
    list.push({ id: `money:${multiplier}`, rarity, category: "money", kind: "money", multiplier });
  }
  // 아이템 선택 찬스 (원본 아이템 고르기 화면을 한 번 더)
  const T = ModifierTier;
  const shops: [ModifierTier[], RewardRarity][] = [
    [[T.COMMON, T.COMMON, T.COMMON], T.COMMON],
    [[T.COMMON, T.COMMON, T.GREAT], T.COMMON],
    [[T.GREAT, T.GREAT, T.GREAT], T.GREAT],
    [[T.COMMON, T.GREAT, T.GREAT, T.ULTRA], T.GREAT],
    [[T.GREAT, T.GREAT, T.ULTRA], T.GREAT],
    [[T.ULTRA, T.ULTRA, T.ULTRA], T.ULTRA],
    [[T.GREAT, T.GREAT, T.ULTRA, T.ULTRA], T.ULTRA],
    [[T.COMMON, T.GREAT, T.ULTRA, T.ROGUE], T.ULTRA],
    [[T.GREAT, T.ULTRA, T.ULTRA, T.ROGUE, T.ROGUE], T.ROGUE],
    [[T.ROGUE, T.ROGUE, T.ROGUE], T.ROGUE],
    [[T.ULTRA, T.ROGUE, T.ROGUE, T.MASTER], T.MASTER],
    [[T.ROGUE, T.ROGUE, T.MASTER, T.MASTER, T.MASTER], T.MASTER],
  ];
  for (const [tiers, rarity] of shops) {
    list.push({ id: `shop:${tiers.join("")}`, rarity, category: "shop", kind: "shop", tiers });
  }
  // 룰렛권
  list.push(
    { id: "roulette:1", rarity: T.GREAT, category: "roulette", kind: "roulette", spins: 1, jackpot: false },
    { id: "roulette:2", rarity: T.ULTRA, category: "roulette", kind: "roulette", spins: 2, jackpot: false },
    { id: "roulette:3", rarity: T.ROGUE, category: "roulette", kind: "roulette", spins: 3, jackpot: false },
    { id: "roulette:jackpot", rarity: T.MASTER, category: "roulette", kind: "roulette", spins: 1, jackpot: true },
  );

  catalog = list;
  return list;
}

/**
 * 아이템 보상의 실제 {@linkcode ModifierType}을 만든다.
 * @returns 만들 수 없으면 `null`
 */
export function createRewardModifierType(def: RewardDef, party: readonly PlayerPokemon[]): ModifierType | null {
  if (def.kind !== "item") {
    return null;
  }
  const func = getFunc(def.key);
  if (!func) {
    return null;
  }
  try {
    let type: ModifierType | null = func()
      .withIdFromFunc(func)
      .withTierFromPool(ModifierPoolType.PLAYER, party as PlayerPokemon[]);
    if (type instanceof ModifierTypeGenerator) {
      type = type.generateType(party, def.args);
    }
    return type;
  } catch {
    return null;
  }
}

/** 지금 파티에 쓸모가 있는 보상인지 (배울 수 없는 기술머신, 진화하지 않는 진화 아이템 등은 뺀다) */
export function isRewardUsable(def: RewardDef, party: readonly PlayerPokemon[]): boolean {
  if (def.kind !== "item") {
    return true;
  }
  const type = createRewardModifierType(def, party);
  if (!type) {
    return false;
  }
  // 전용 도구는 해당 포켓몬이 파티에 있을 때만
  if (def.category === "speciesItem") {
    const info =
      SpeciesStatBoosterModifierTypeGenerator.items[
        def.args![0] as keyof typeof SpeciesStatBoosterModifierTypeGenerator.items
      ];
    return party.some(p => (info.species as readonly number[]).includes(p.species.speciesId));
  }
  if (type instanceof PokemonModifierType && type.selectFilter) {
    const filter = type.selectFilter;
    return party.some(p => {
      try {
        return !filter(p);
      } catch {
        return false;
      }
    });
  }
  return true;
}

/** 등급 가중치: 층이 높고 연속 정답이 많을수록 좋은 등급이 잘 나온다 */
export function rarityWeights(wave: number, luck: number, minRarity: RewardRarity = ModifierTier.COMMON): number[] {
  const boost = Math.min(wave / 40, 4) + luck;
  const base = [60, 28 + boost * 3, 9 + boost * 3, 2.5 + boost * 1.5, 0.5 + boost * 0.6];
  return base.map((w, i) => (i < minRarity ? 0 : w));
}

export interface DrawOptions {
  wave: number;
  /** 행운 (연속 정답 등) */
  luck?: number;
  /** 이 등급 이상만 */
  minRarity?: RewardRarity;
  /** 쓸모 검사 (기본: 항상 쓸모 있음) */
  usable?: (def: RewardDef) => boolean;
  rng?: () => number;
}

/** 보상을 `count`개 뽑는다 (같은 보상은 한 번만) */
export function drawRewards(count: number, opts: DrawOptions): RewardDef[] {
  const rng = opts.rng ?? Math.random;
  const usable = opts.usable ?? (() => true);
  const all = getRewardCatalog();
  const weights = rarityWeights(opts.wave, opts.luck ?? 0, opts.minRarity);
  const total = weights.reduce((a, b) => a + b, 0);
  const picked: RewardDef[] = [];
  const used = new Set<string>();

  for (let attempt = 0; picked.length < count && attempt < count * 60; attempt++) {
    // 1) 등급
    let roll = rng() * total;
    let rarity: RewardRarity = ModifierTier.COMMON;
    for (const r of RARITIES) {
      roll -= weights[r];
      if (roll < 0) {
        rarity = r;
        break;
      }
    }
    // 2) 분류 → 3) 보상
    const ofRarity = all.filter(d => d.rarity === rarity && !used.has(d.id));
    if (ofRarity.length === 0) {
      continue;
    }
    const categories = [...new Set(ofRarity.map(d => d.category))];
    const category = categories[Math.floor(rng() * categories.length)];
    const candidates = ofRarity.filter(d => d.category === category);
    const def = candidates[Math.floor(rng() * candidates.length)];
    if (usable(def)) {
      used.add(def.id);
      picked.push(def);
    }
  }
  return picked;
}
