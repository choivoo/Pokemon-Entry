import { audioManager } from "#app/global-audio-manager";
import { globalScene } from "#app/global-scene";
import { type RewardCard, type RewardMode, showRewardScreen } from "#app/math/math-reward-ui";
import { createRewardModifierType, drawRewards, isRewardUsable, type RewardDef } from "#app/math/math-rewards";
import { type MathLang, toMathLang, ui } from "#app/math/math-text";
import { getPokeballName } from "#data/pokeball";
import { ModifierTier } from "#enums/modifier-tier";
import { PokeballType } from "#enums/pokeball";
import { AddPokeballModifierType, ModifierTypeOption, PokemonModifierType } from "#modifiers/modifier-type";
import { BattlePhase } from "#phases/battle-phase";
import i18next from "i18next";

/** 보상 화면 함수 (테스트에서 바꿔 끼울 수 있도록 객체로 둔다) */
export const mathRewardHooks = { show: showRewardScreen };

const BALL_ICONS: Record<number, string> = {
  [PokeballType.POKEBALL]: "pb",
  [PokeballType.GREAT_BALL]: "gb",
  [PokeballType.ULTRA_BALL]: "ub",
  [PokeballType.ROGUE_BALL]: "rb",
  [PokeballType.MASTER_BALL]: "mb",
};

const iconUrl = (icon: string) => `./images/items/${icon}.png`;

function moneyAmount(multiplier: number): number {
  try {
    return globalScene.getWaveMoneyAmount(multiplier);
  } catch {
    return 100 * multiplier;
  }
}

/** 보상 정의 → 화면에 보여줄 카드 */
export function rewardToCard(def: RewardDef, lang: MathLang): RewardCard {
  const party = globalScene.getPlayerParty();
  switch (def.kind) {
    case "item": {
      const type = createRewardModifierType(def, party);
      let description = "";
      try {
        description = type?.getDescription() ?? "";
      } catch {
        // 설명을 만들 수 없는 아이템은 이름만 보여준다
      }
      return {
        name: type?.name ?? def.key,
        description,
        icon: iconUrl(type?.iconImage ?? "unknown"),
        rarity: def.rarity,
      };
    }
    case "balls":
      return {
        name: ui(lang, "rewardBalls", { ball: getPokeballName(def.ball), n: def.count }),
        description: ui(lang, "rewardBallsDesc"),
        icon: iconUrl(BALL_ICONS[def.ball] ?? "pb"),
        rarity: def.rarity,
      };
    case "money":
      return {
        name: ui(lang, "rewardMoney", { amount: moneyAmount(def.multiplier).toLocaleString() }),
        description: ui(lang, "rewardMoneyDesc"),
        icon: iconUrl(def.multiplier >= 10 ? "relic_gold" : def.multiplier >= 3 ? "big_nugget" : "nugget"),
        rarity: def.rarity,
      };
    case "shop":
      return {
        name: ui(lang, "rewardShop", { n: def.tiers.length }),
        description: ui(lang, "rewardShopDesc", { tiers: def.tiers.map(t => ui(lang, `rarity${t}`)).join("·") }),
        icon: iconUrl("coupon"),
        rarity: def.rarity,
      };
    case "roulette":
      return def.jackpot
        ? {
            name: ui(lang, "rewardJackpot"),
            description: ui(lang, "rewardJackpotDesc"),
            icon: iconUrl("golden_mystic_ticket"),
            rarity: def.rarity,
          }
        : {
            name: ui(lang, "rewardRoulette", { n: def.spins }),
            description: ui(lang, "rewardRouletteDesc", { n: def.spins }),
            icon: iconUrl("mystic_ticket"),
            rarity: def.rarity,
          };
  }
}

/**
 * 수학 관문 보상 단계: 보상 화면(룰렛·보물 상자·고르기)을 띄우고, 받은 보상을 원본 시스템으로 지급한다.
 * - 포켓몬에게 주는 아이템(기술머신, 민트, 지닌 도구 등): 원본 아이템 고르기 화면에서 받을 포켓몬을 고른다
 * - 바로 쓰는 아이템·몬스터볼·돈: 바로 지급
 * - 아이템 선택 찬스: 원본 아이템 고르기 화면을 한 번 더 연다
 * - 룰렛권: 룰렛을 더 돌린다
 */
export class MathRewardPhase extends BattlePhase {
  public readonly phaseName = "MathRewardPhase";
  private readonly mode: RewardMode;
  private readonly luck: number;
  private readonly fixed: RewardDef[] | undefined;

  /**
   * @param mode - 보상 화면 종류
   * @param luck - 행운 (좋은 등급이 잘 나옴)
   * @param fixed - 뽑는 대신 이 보상들을 보여준다 (테스트용)
   */
  constructor(mode: RewardMode, luck = 0, fixed?: RewardDef[]) {
    super();
    this.mode = mode;
    this.luck = luck;
    this.fixed = fixed;
  }

  public override start(): void {
    super.start();

    const party = globalScene.getPlayerParty();
    const wave = globalScene.currentBattle?.waveIndex ?? 1;
    const lang = toMathLang(i18next.resolvedLanguage);
    const isWheel = this.mode === "roulette" || this.mode === "jackpot";
    const defs =
      this.fixed
      ?? drawRewards(isWheel ? 8 : 3, {
        wave,
        luck: this.luck,
        minRarity: this.mode === "jackpot" ? ModifierTier.ULTRA : ModifierTier.COMMON,
        usable: d => isRewardUsable(d, party),
      });
    if (defs.length === 0) {
      this.end();
      return;
    }

    mathRewardHooks
      .show({
        mode: this.mode,
        cards: defs.map(d => rewardToCard(d, lang)),
        lang,
        playSound: key => {
          try {
            switch (key) {
              case "select":
              case "tick":
                audioManager.playSound("ui/select");
                break;
              case "spin":
                audioManager.playSound("ui/menu_open");
                break;
              case "open":
                audioManager.playSound("se/pb_rel");
                break;
              case "win":
                audioManager.playSound("se/item_fanfare");
                break;
            }
          } catch {
            // 소리 재생 실패는 무시
          }
        },
      })
      .then(index => this.grant(defs[index] ?? defs[0], lang));
  }

  /** 보상 지급 */
  private grant(def: RewardDef, lang: MathLang): void {
    const pm = globalScene.phaseManager;
    switch (def.kind) {
      case "item": {
        const type = createRewardModifierType(def, globalScene.getPlayerParty());
        if (!type) {
          this.end();
          return;
        }
        if (type instanceof PokemonModifierType) {
          // 받을 포켓몬을 원본 아이템 고르기 화면에서 고른다
          pm.unshiftNew("SelectModifierPhase", 0, undefined, {
            guaranteedModifierTypeOptions: [new ModifierTypeOption(type, 0, 0)],
            fillRemaining: false,
            rerollMultiplier: -1,
          });
          this.end();
          return;
        }
        globalScene.addModifier(type.newModifier());
        this.announce(i18next.t("battle:rewardGain", { modifierName: type.name }));
        return;
      }
      case "balls": {
        const type = new AddPokeballModifierType(BALL_ICONS[def.ball] ?? "pb", def.ball, def.count);
        globalScene.addModifier(type.newModifier());
        this.announce(ui(lang, "gotBalls", { ball: getPokeballName(def.ball), n: def.count }));
        return;
      }
      case "money": {
        const amount = moneyAmount(def.multiplier);
        globalScene.addMoney(amount);
        this.announce(ui(lang, "gotMoney", { amount: amount.toLocaleString() }));
        return;
      }
      case "shop":
        pm.unshiftNew("SelectModifierPhase", 0, undefined, {
          guaranteedModifierTiers: def.tiers,
          fillRemaining: false,
        });
        this.end();
        return;
      case "roulette":
        for (let i = 0; i < def.spins; i++) {
          pm.unshiftNew("MathRewardPhase", def.jackpot ? "jackpot" : "roulette", this.luck);
        }
        this.end();
        return;
    }
  }

  private announce(text: string): void {
    audioManager.playSound("se/item_fanfare");
    globalScene.ui.showText(text, null, () => this.end(), null, true);
  }
}
