import { updateUserInfo } from "#app/account";
import { backend } from "#app/edu/backend";
import { audioManager } from "#app/global-audio-manager";
import { globalScene } from "#app/global-scene";
import { TextStyle } from "#enums/text-style";
import type { ModalConfig } from "#types/ui-types";
import { ModalUiHandler } from "#ui/modal-ui-handler";
import { addTextObject } from "#ui/text";
import { sessionIdKey } from "#utils/common";
import { removeCookie } from "#utils/cookies";
import i18next from "i18next";

export class UnavailableModalUiHandler extends ModalUiHandler {
  private label: Phaser.GameObjects.Text;
  private reconnectDuration: number;
  private reconnectCallback: () => void;

  private readonly minTime = 1000 * 5;
  private readonly maxTime = 1000 * 60 * 5;

  private readonly randVarianceTime = 1000 * 10;

  constructor() {
    super();

    this.reconnectDuration = this.minTime;
  }

  getModalTitle(): string {
    return "";
  }

  getWidth(): number {
    return 160;
  }

  getHeight(): number {
    return 64;
  }

  getMargin(): [number, number, number, number] {
    return [0, 0, 48, 0];
  }

  getButtonLabels(): string[] {
    return [];
  }

  setup(): void {
    super.setup();

    const label = addTextObject(this.getWidth() / 2, this.getHeight() / 2, this.errorText(), TextStyle.WINDOW, {
      fontSize: "48px",
      align: "center",
    });
    label.setOrigin(0.5, 0.5);
    this.label = label;

    this.modalContainer.add(label);
  }

  /**
   * 서버에 연결하지 못했을 때 보여 주는 글.
   * 원본 글에는 외부 커뮤니티(Discord) 안내가 있어서, 학교에서 쓰는 안내와 실제 원인으로 바꿔 보여 준다.
   */
  private errorText(): string {
    const cause = backend.lastError ? backend.lastError.slice(0, 44) : "";
    if (i18next.resolvedLanguage?.startsWith("ko")) {
      return `서버에 연결하지 못했어요.\n${cause ? `(${cause})\n` : ""}잠시 뒤 자동으로 다시 접속해요.\n계속되면 선생님께 알려 주세요.\n점검: 주소 끝에 ?diag 를 붙여 보세요.`;
    }
    return `Could not reach the server.\n${cause ? `(${cause})\n` : ""}Retrying automatically.\nAsk your teacher if it continues.\nCheck: add ?diag to the page address.`;
  }

  tryReconnect(): void {
    updateUserInfo().then(response => {
      if (response[0] || [200, 400].includes(response[1])) {
        this.reconnectDuration = this.minTime;
        audioManager.playSound("se/pb_bounce_1");
        this.reconnectCallback();
      } else if (response[1] === 401) {
        removeCookie(sessionIdKey);
        globalScene.reset(true, true);
      } else {
        this.reconnectDuration = Math.min(this.reconnectDuration * 2, this.maxTime); // Set a max delay so it isn't infinite
        setTimeout(
          () => this.tryReconnect(),
          // Adds a random factor to avoid pendulum effect during long total breakdown
          this.reconnectDuration + Math.random() * this.randVarianceTime,
        );
      }
    });
  }

  show(args: any[]): boolean {
    if (args.length > 0 && args[0] instanceof Function) {
      const config: ModalConfig = {
        buttonActions: [],
      };

      this.label?.setText(this.errorText());
      this.reconnectCallback = args[0];
      this.reconnectDuration = this.minTime;
      setTimeout(() => this.tryReconnect(), this.reconnectDuration);

      return super.show([config]);
    }

    return false;
  }
}
