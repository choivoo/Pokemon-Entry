import { globalScene } from "#app/global-scene";
import { BattlePhase } from "#phases/battle-phase";
import { needsMathGate } from "#phases/math-gate-phase";

export class NewBattlePhase extends BattlePhase {
  public readonly phaseName = "NewBattlePhase";
  start() {
    super.start();

    // 수학 포켓로그: 포획·도주·이상한 만남 등으로 승리 단계를 거치지 않은 경우에도
    // 다음 층으로 가기 전에 반드시 수학 관문을 통과하게 한다.
    const wave = globalScene.currentBattle?.waveIndex ?? 0;
    if (needsMathGate(wave)) {
      // 자식 단계는 추가한 순서대로 실행된다: 관문 → 새 전투
      globalScene.phaseManager.unshiftNew("MathGatePhase");
      globalScene.phaseManager.unshiftNew("NewBattlePhase");
      this.end();
      return;
    }

    globalScene.phaseManager.removeAllPhasesOfType("NewBattlePhase");

    globalScene.newBattle();

    this.end();
  }
}
