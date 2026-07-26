interface ImmersiveDocument extends Document {
  immersiveEnabled?: boolean;
  immersiveElement?: Element | null;
  exitImmersive?: () => Promise<void>;
}

export interface SpatialSetControllerOptions {
  onEvent: (type: string, detail: string) => void;
  onNotice: (message: string, state: "supported" | "unsupported" | "error") => void;
}

export function canUseSpatialImmersive(
  model: Pick<HTMLModelElement, "requestImmersive">,
  immersiveDocument: Pick<ImmersiveDocument, "immersiveEnabled">,
): boolean {
  return (
    typeof model.requestImmersive === "function" &&
    immersiveDocument.immersiveEnabled !== false
  );
}

export class SpatialSetController {
  readonly #root: HTMLElement;
  readonly #model: HTMLModelElement;
  readonly #enterButton: HTMLButtonElement;
  readonly #exitButton: HTMLButtonElement;
  readonly #status: HTMLElement;
  readonly #immersiveDocument = document as ImmersiveDocument;
  readonly #options: SpatialSetControllerOptions;
  #disposed = false;
  #ready = false;

  constructor(root: HTMLElement, options: SpatialSetControllerOptions) {
    this.#root = root;
    this.#options = options;
    this.#model = this.#requiredElement<HTMLModelElement>("spatial-set-model");
    this.#enterButton = this.#requiredElement<HTMLButtonElement>("spatial-set-enter");
    this.#exitButton = this.#requiredElement<HTMLButtonElement>("spatial-set-exit");
    this.#status = this.#requiredElement<HTMLElement>("spatial-set-status");

    this.#enterButton.addEventListener("click", this.#enter);
    this.#exitButton.addEventListener("click", this.#exit);
    this.#model.addEventListener("immersivechange", this.#handleImmersiveChange);
    this.#model.addEventListener("immersiveerror", this.#handleImmersiveError);
    void this.#initialize();
  }

  dispose(): void {
    this.#disposed = true;
    this.#enterButton.removeEventListener("click", this.#enter);
    this.#exitButton.removeEventListener("click", this.#exit);
    this.#model.removeEventListener("immersivechange", this.#handleImmersiveChange);
    this.#model.removeEventListener("immersiveerror", this.#handleImmersiveError);
  }

  async #initialize(): Promise<void> {
    this.#setStatus("正在解码 3.7 KB 本地 USDZ…", "loading");
    this.#enterButton.disabled = true;

    if (!this.#model.ready) {
      this.#setStatus("此浏览器显示静态预览；沉浸入口会自动隐藏。", "fallback");
      return;
    }

    try {
      await this.#model.ready;
      if (this.#disposed) {
        return;
      }
      this.#ready = true;
      const immersiveAvailable = canUseSpatialImmersive(this.#model, this.#immersiveDocument);
      this.#enterButton.disabled = !immersiveAvailable;
      this.#setStatus(
        immersiveAvailable
          ? "模型已就绪，可从网页进入真实尺度空间布景。"
          : "三维模型已就绪；当前平台仅支持内联预览。",
        immersiveAvailable ? "ready" : "preview",
      );
      this.#options.onEvent(
        "spatial-set-ready",
        immersiveAvailable ? "inline-and-immersive" : "inline-only",
      );
    } catch (error) {
      if (this.#disposed) {
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.#setStatus("USDZ 无法载入，已保留静态预览。", "error");
      this.#options.onEvent("spatial-set-load-error", message);
    }
  }

  readonly #enter = async (): Promise<void> => {
    if (
      !this.#ready ||
      !canUseSpatialImmersive(this.#model, this.#immersiveDocument) ||
      !this.#model.requestImmersive
    ) {
      return;
    }

    this.#enterButton.disabled = true;
    this.#setStatus("正在打开轨道庭院…", "loading");
    this.#options.onEvent("spatial-set-requested", "orbital-courtyard");

    try {
      await this.#model.requestImmersive();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.#enterButton.disabled = false;
      this.#setStatus("未能进入空间布景，请保持页面在前台后重试。", "error");
      this.#options.onEvent("spatial-set-enter-error", message);
      this.#options.onNotice(`空间布景启动失败：${message}`, "error");
    }
  };

  readonly #exit = async (): Promise<void> => {
    if (typeof this.#immersiveDocument.exitImmersive !== "function") {
      return;
    }

    try {
      await this.#immersiveDocument.exitImmersive();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.#options.onEvent("spatial-set-exit-error", message);
      this.#options.onNotice(`无法退出空间布景：${message}`, "error");
    }
  };

  readonly #handleImmersiveChange = (): void => {
    const isImmersive = this.#immersiveDocument.immersiveElement === this.#model;
    this.#root.dataset.immersive = String(isImmersive);
    this.#enterButton.hidden = isImmersive;
    this.#enterButton.disabled = !this.#ready;
    this.#exitButton.hidden = !isImmersive;
    this.#setStatus(
      isImmersive
        ? "空间布景已展开。可随时点按退出，或使用 Digital Crown。"
        : "已返回网页；模型保持就绪，可再次进入。",
      isImmersive ? "immersive" : "ready",
    );
    this.#options.onEvent(isImmersive ? "spatial-set-entered" : "spatial-set-exited", "orbital-courtyard");
    this.#options.onNotice(
      isImmersive ? "visionOS 27 空间布景已展开。" : "已退出空间布景并返回网页。",
      "supported",
    );
  };

  readonly #handleImmersiveError = (event: Event): void => {
    this.#setStatus("空间布景发生系统错误，已保留网页预览。", "error");
    this.#options.onEvent("spatial-set-immersive-error", event.type);
  };

  #setStatus(message: string, state: string): void {
    this.#status.textContent = message;
    this.#status.dataset.state = state;
  }

  #requiredElement<T extends Element>(id: string): T {
    const element = this.#root.querySelector(`#${id}`);
    if (!element) {
      throw new Error(`Spatial Set requires #${id}.`);
    }
    return element as T;
  }
}
