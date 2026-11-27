import { audioManager } from "#app/global-audio-manager";
import { globalScene } from "#app/global-scene";
import { showMathGate } from "#app/math/math-gate-ui";
import type { RewardMode } from "#app/math/math-reward-ui";
import { toMathLang } from "#app/math/math-text";
import { activeOverrides as Overrides } from "#app/overrides";
import { Phase } from "#app/phase";
import { IS_TEST } from "#constants/app-constants";
import i18next from "i18next";

/** 수학 관문 진행 상황 (런 단위) */
export const mathGateState = {
  /** 런을 구분하는 시드 (바뀌면 진행 상황 초기화) */
  seed: "",
  /** 마지막으로 관문을 통과한 웨이브 */
  clearedWave: -1,
  /** 첫 시도 연속 정답 수 */
  streak: 0,
};

/** 진행 상황 초기화 */
export function resetMathGateState(): void {
  mathGateState.seed = "";
  mathGateState.clearedWave = -1;
  mathGateState.streak = 0;
}

const REWARD_MODES: readonly [RewardMode, number][] = [
  ["roulette", 40],
  ["box", 30],
  ["choice", 30],
];

/**
 * 정답 후 받을 보상 기회를 정한다.
 * - 정답: 1번 (룰렛 / 보물 상자 / 보상 고르기 중 무작위)
 * - 힌트 없이 한 번에 정답: +1번
 * - 연속 정답 5번마다: 잭팟 룰렛 +1번
 */
export function planRewards(perfect: boolean, streak: number, rng: () => number = Math.random): RewardMode[] {
  const pickMode = (): RewardMode => {
    let roll = rng() * 100;
    for (const [mode, weight] of REWARD_MODES) {
      roll -= weight;
      if (roll < 0) {
        return mode;
      }
    }
    return "roulette";
  };
  const modes: RewardMode[] = [pickMode()];
  if (perfect) {
    modes.push(pickMode());
  }
  if (perfect && streak > 0 && streak % 5 === 0) {
    modes.push("jackpot");
  }
  return modes;
}

/** 관문 화면 함수 (테스트에서 바꿔 끼울 수 있도록 객체로 둔다) */
export const mathGateHooks = { show: showMathGate };

/** 수학 관문을 써야 하는지 (자동화 테스트에서는 기본적으로 꺼짐, `MATH_GATE_OVERRIDE`로 강제 가능) */
export function isMathGateEnabled(): boolean {
  return Overrides.MATH_GATE_OVERRIDE ?? (!IS_TEST && typeof document !== "undefined");
}

/** 이 웨이브를 클리어한 뒤 아직 관문을 통과하지 않았는지 */
export function needsMathGate(wave: number): boolean {
  const seed = globalScene?.seed ?? "";
  if (mathGateState.seed !== seed) {
    mathGateState.seed = seed;
    mathGateState.clearedWave = -1;
    mathGateState.streak = 0;
  }
  return isMathGateEnabled() && wave >= 1 && mathGateState.clearedWave !== wave;
}

/**
 * 층 사이의 "수학 관문".
 * 비례식/비례배분 문제를 맞혀야 다음 층이 열린다.
 * 정답 → 다음 층 개방 → (기존 흐름) 아이템 선택 → 다음 포켓몬 전투
 */
export class MathGatePhase extends Phase {
  public readonly phaseName = "MathGatePhase";

  public override start(): void {
    super.start();

    const wave = globalScene.currentBattle?.waveIndex ?? 0;
    if (!needsMathGate(wave)) {
      this.end();
      return;
    }

    const names = globalScene
      .getPlayerParty()
      .map(p => p.getNameToRender({ useIllusion: false }))
      .filter(n => !!n);

    mathGateHooks
      .show({
        wave,
        lang: toMathLang(i18next.resolvedLanguage),
        names,
        streak: mathGateState.streak,
        bonus: 1,
        playSound: key => {
          try {
            switch (key) {
              case "select":
                audioManager.playSound("ui/select");
                break;
              case "error":
                audioManager.playSound("ui/error");
                break;
              case "correct":
                audioManager.playSound("se/level_up_fanfare");
                break;
              case "open":
                audioManager.playSound("se/pb_rel");
                break;
            }
          } catch {
            // 소리 재생 실패는 무시
          }
        },
      })
      .then(result => {
        mathGateState.clearedWave = wave;
        mathGateState.streak = result.perfect ? mathGateState.streak + 1 : 0;
        for (const mode of planRewards(result.perfect, mathGateState.streak)) {
          globalScene.phaseManager.unshiftNew("MathRewardPhase", mode, Math.min(mathGateState.streak, 10) * 0.15);
        }
        this.end();
      });
  }
}
