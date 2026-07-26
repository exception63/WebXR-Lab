import QRCode from "qrcode";
import "./styles.css";
import {
  experienceAvailability,
  experienceRegistry,
  type ExperienceAvailability,
} from "./experiences/registry";
import { createCapabilityReport } from "./probe/browserProbe";
import { ReportStore } from "./probe/ReportStore";
import type { CapabilityReport, SessionSupport, SupportState } from "./probe/types";
import {
  parsePreferences,
  renderProfileScale,
  type RenderProfile,
} from "./preferences/ExperiencePreferences";
import { SpatialSetController } from "./spatial/SpatialSetController";
import { prewarmIntroExperience } from "./xr/ExperienceRuntime";
import { ProbeScene } from "./xr/ProbeScene";
import { XRSessionProbe } from "./xr/XRSessionProbe";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Application root #app was not found.");
}

app.innerHTML = `
  <canvas id="spatial-canvas" aria-hidden="true"></canvas>
  <div class="atmosphere" aria-hidden="true">
    <div class="reticle reticle--one"></div>
    <div class="reticle reticle--two"></div>
    <div class="scanline"></div>
  </div>

  <main class="console-shell">
    <header class="topbar">
      <a class="brand" href="/" aria-label="WebXR-Lab home">
        <span class="brand__mark" aria-hidden="true"><i></i><i></i><i></i></span>
        <span>
          <strong>WEBXR—LAB</strong>
          <small>SPATIAL SYSTEMS CONSOLE</small>
        </span>
      </a>
      <div class="topbar__meta">
        <span class="run-tag">M1 / PROBE</span>
        <span id="clock" class="clock">--:--:--</span>
      </div>
    </header>

    <section class="hero">
      <div class="hero__copy">
        <p class="eyebrow"><span></span> VISION PRO FIRST CONTACT</p>
        <h1>让设备<br /><em>说出真相。</em></h1>
        <p class="hero__lede">
          这不是兼容性猜测，而是一台运行在浏览器里的空间测量仪。
          它会直接记录会话、凝视捏合、手部关节与帧时间。
        </p>
      </div>

      <aside class="readiness" aria-label="System readiness">
        <div class="readiness__dial">
          <svg viewBox="0 0 140 140" role="img" aria-labelledby="dial-title">
            <title id="dial-title">Probe readiness</title>
            <circle class="dial-track" cx="70" cy="70" r="56"></circle>
            <circle id="dial-progress" class="dial-progress" cx="70" cy="70" r="56"></circle>
          </svg>
          <span id="readiness-score">0</span>
        </div>
        <div>
          <small>SYSTEM READINESS</small>
          <strong id="readiness-label">SCANNING</strong>
          <p id="readiness-copy">正在检查安全上下文和浏览器接口。</p>
        </div>
      </aside>
    </section>

    <section class="exhibit-index" aria-labelledby="exhibit-index-title">
      <header class="exhibit-index__header">
        <div>
          <p class="eyebrow"><span></span> ORBITAL ARCHIVE / M2</p>
          <h2 id="exhibit-index-title">下一站，<em>空间实验馆。</em></h2>
        </div>
        <p>
          每一扇门户只证明一件事。Registry 会读取当前浏览器的真实能力，
          决定哪些展项可以进入、哪些等待设备增强。
        </p>
      </header>
      <div id="experience-list" class="experience-list" aria-live="polite"></div>
    </section>

    <section class="instrument-grid">
      <article class="panel panel--primary">
        <header class="panel__header">
          <div>
            <span class="panel__index">01</span>
            <h2>会话发射台</h2>
          </div>
          <span id="session-state" class="status-pill" data-state="unknown">IDLE</span>
        </header>

        <div class="launch-copy">
          <p>
            进入沉浸模式后，中央核心会响应捏合；青色与橙色轨迹分别显示左右输入。
            完整手部数据获得授权后，关节会以光点呈现。
          </p>
        </div>

        <div class="launch-actions">
          <button id="launch-vr" class="launch-button launch-button--primary" disabled>
            <span class="launch-button__icon" aria-hidden="true">⌁</span>
            <span>
              <strong>进入 VR 探针</strong>
              <small>IMMERSIVE–VR + HAND TRACKING</small>
            </span>
            <b aria-hidden="true">↗</b>
          </button>
          <button id="launch-ar" class="launch-button" disabled>
            <span class="launch-button__icon" aria-hidden="true">◫</span>
            <span>
              <strong>进入 Quest MR 实验场</strong>
              <small>IMMERSIVE–AR + HIT TEST / CAPABILITY GATED</small>
            </span>
            <b aria-hidden="true">↗</b>
          </button>
        </div>

        <div class="experience-settings" aria-label="体验与性能设置">
          <div class="experience-settings__header">
            <div>
              <small>EXPERIENCE PROFILE</small>
              <strong>体验与性能</strong>
            </div>
            <span id="frame-budget">P95 -- MS</span>
          </div>
          <div class="profile-switch" role="group" aria-label="渲染档位">
            <button data-render-profile="performance">流畅</button>
            <button data-render-profile="balanced">平衡</button>
            <button data-render-profile="fidelity">画质</button>
          </div>
          <div class="comfort-switches">
            <button id="reduced-motion" aria-pressed="false">
              <span>减少动态</span><small>降低背景旋转与呼吸动画</small>
            </button>
            <button id="guided-mode" aria-pressed="true">
              <span>讲解模式</span><small>保留完整步骤提示</small>
            </button>
            <button id="show-onboarding">
              <span>查看入馆指南</span><small>重新打开三步说明</small>
            </button>
          </div>
        </div>

        <div id="notice" class="notice" aria-live="polite">
          <span aria-hidden="true">●</span>
          <p>等待浏览器扫描。</p>
        </div>
      </article>

      <article class="panel panel--matrix">
        <header class="panel__header">
          <div>
            <span class="panel__index">02</span>
            <h2>能力矩阵</h2>
          </div>
          <button id="rescan" class="text-button">重新扫描</button>
        </header>
        <div id="capability-list" class="capability-list" aria-live="polite"></div>
      </article>

      <article class="panel panel--signal">
        <header class="panel__header">
          <div>
            <span class="panel__index">03</span>
            <h2>输入信号</h2>
          </div>
          <span id="input-count" class="counter">00</span>
        </header>
        <div id="input-sources" class="input-sources">
          <div class="empty-signal">
            <span aria-hidden="true"></span>
            进入沉浸会话后等待输入源
          </div>
        </div>
        <ol id="event-log" class="event-log"></ol>
      </article>

      <article class="panel panel--report">
        <header class="panel__header">
          <div>
            <span class="panel__index">04</span>
            <h2>本机链路</h2>
          </div>
          <span id="secure-state" class="status-pill" data-state="unknown">CHECK</span>
        </header>
        <div class="link-grid">
          <canvas id="qr-code" width="164" height="164" aria-label="Current page QR code"></canvas>
          <div class="link-details">
            <small>HEADSET ENDPOINT</small>
            <code id="endpoint">${window.location.href}</code>
            <p id="certificate-note">正在验证 HTTPS 安全上下文。</p>
            <div class="compact-actions">
              <button id="copy-link" class="text-button">复制地址</button>
              <button id="save-report" class="text-button">保存至 Mac</button>
              <button id="export-report" class="text-button">导出 JSON</button>
            </div>
          </div>
        </div>
      </article>
    </section>

    <footer class="console-footer">
      <p><span>LOCAL ONLY</span> 诊断数据不会发送到第三方。</p>
      <p id="build-label">BUILD development</p>
    </footer>
  </main>

  <dialog id="onboarding" class="onboarding" aria-labelledby="onboarding-title">
    <form method="dialog">
      <header>
        <p class="eyebrow"><span></span> FIRST ENTRY / 3 SIGNALS</p>
        <button value="close" aria-label="关闭入馆指南">×</button>
      </header>
      <h2 id="onboarding-title">第一次进入，<em>只记住三件事。</em></h2>
      <ol>
        <li><b>01</b><div><strong>设备自己决定入口</strong><p>VR、Quest MR 与 visionOS 空间布景都由实时能力门控，不需要你猜浏览器版本。</p></div></li>
        <li><b>02</b><div><strong>注视，然后捏合</strong><p>在头显里瞄准发光目标；Vision Pro 捏合，Quest 可用手势或控制器选择。</p></div></li>
        <li><b>03</b><div><strong>退出就会保存</strong><p>使用场景按钮或系统退出，诊断报告会自动写回这台 Mac。</p></div></li>
      </ol>
      <footer>
        <label><input id="onboarding-remember" type="checkbox" checked /> 以后不再自动显示</label>
        <button id="onboarding-start" class="onboarding__start" value="start">开始探索 ↗</button>
      </footer>
    </form>
  </dialog>
`;

const canvas = requiredElement<HTMLCanvasElement>("spatial-canvas");
const capabilityList = requiredElement<HTMLDivElement>("capability-list");
const eventLog = requiredElement<HTMLOListElement>("event-log");
const inputSources = requiredElement<HTMLDivElement>("input-sources");
const launchVR = requiredElement<HTMLButtonElement>("launch-vr");
const launchAR = requiredElement<HTMLButtonElement>("launch-ar");
const rescan = requiredElement<HTMLButtonElement>("rescan");
const exportReport = requiredElement<HTMLButtonElement>("export-report");
const saveReport = requiredElement<HTMLButtonElement>("save-report");
const copyLink = requiredElement<HTMLButtonElement>("copy-link");
const notice = requiredElement<HTMLDivElement>("notice");
const qrCanvas = requiredElement<HTMLCanvasElement>("qr-code");
const experienceList = requiredElement<HTMLDivElement>("experience-list");
const reducedMotionButton = requiredElement<HTMLButtonElement>("reduced-motion");
const guidedModeButton = requiredElement<HTMLButtonElement>("guided-mode");
const showOnboardingButton = requiredElement<HTMLButtonElement>("show-onboarding");
const onboarding = requiredElement<HTMLDialogElement>("onboarding");
const onboardingRemember = requiredElement<HTMLInputElement>("onboarding-remember");

const probeScene = new ProbeScene(canvas);
const preferenceStorageKey = "webxr-lab:experience-preferences:v1";
let preferences = parsePreferences(
  localStorage.getItem(preferenceStorageKey),
  window.matchMedia("(prefers-reduced-motion: reduce)").matches,
);
let reportStore: ReportStore | null = null;
let sessionProbe: XRSessionProbe | null = null;
let spatialSetController: SpatialSetController | null = null;
let experienceRenderKey = "";

function requiredElement<T extends Element>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Required element #${id} was not found.`);
  }
  return element as unknown as T;
}

function formatSupport(support: SessionSupport): string {
  const labels: Record<SupportState, string> = {
    supported: "SUPPORTED",
    unsupported: "NO",
    unavailable: "UNAVAILABLE",
    unknown: "UNKNOWN",
    error: "ERROR",
  };
  return labels[support.state];
}

function supportScore(report: CapabilityReport): number {
  const signals = [
    report.page.secureContext,
    report.webgl.available,
    report.webxr.apiAvailable,
    report.webxr.immersiveVR.state === "supported",
    report.spatialWeb.requestImmersive,
  ];
  return Math.round((signals.filter(Boolean).length / signals.length) * 100);
}

function setNotice(message: string, state: SupportState = "unknown"): void {
  notice.dataset.state = state;
  const paragraph = notice.querySelector("p");
  if (paragraph) {
    paragraph.textContent = message;
  }
}

function capabilityRow(label: string, detail: string, state: SupportState): string {
  return `
    <div class="capability-row">
      <span class="capability-row__signal" data-state="${state}" aria-hidden="true"></span>
      <div>
        <strong>${label}</strong>
        <small>${detail}</small>
      </div>
      <b data-state="${state}">${state === "supported" ? "YES" : state.toUpperCase()}</b>
    </div>
  `;
}

function renderReport(report: CapabilityReport): void {
  const modelState: SupportState = report.spatialWeb.modelElement ? "supported" : "unsupported";
  const immersiveState: SupportState = report.spatialWeb.requestImmersive
    ? "supported"
    : "unsupported";

  capabilityList.innerHTML = [
    capabilityRow(
      "安全上下文",
      report.page.secureContext ? "HTTPS / secure context" : "WebXR requires trusted HTTPS",
      report.page.secureContext ? "supported" : "unsupported",
    ),
    capabilityRow(
      "WebGL 2",
      report.webgl.renderer ?? "Renderer unavailable",
      report.webgl.available ? "supported" : "unsupported",
    ),
    capabilityRow(
      "WebXR API",
      report.webxr.apiAvailable ? "navigator.xr detected" : "navigator.xr missing",
      report.webxr.apiAvailable ? "supported" : "unavailable",
    ),
    capabilityRow(
      "Immersive VR",
      formatSupport(report.webxr.immersiveVR),
      report.webxr.immersiveVR.state,
    ),
    capabilityRow(
      "Immersive AR",
      formatSupport(report.webxr.immersiveAR),
      report.webxr.immersiveAR.state,
    ),
    capabilityRow(
      "HTML Model",
      report.spatialWeb.modelElement ? "<model> constructor detected" : "Not exposed",
      modelState,
    ),
    capabilityRow(
      "Spatial Immersive API",
      report.spatialWeb.requestImmersive ? "requestImmersive() detected" : "Not exposed",
      immersiveState,
    ),
  ].join("");

  launchVR.disabled =
    !report.page.secureContext ||
    report.webxr.immersiveVR.state !== "supported" ||
    Boolean(sessionProbe?.active);
  launchAR.disabled =
    !report.page.secureContext ||
    report.webxr.immersiveAR.state !== "supported" ||
    Boolean(sessionProbe?.active);

  const secureState = requiredElement<HTMLSpanElement>("secure-state");
  secureState.dataset.state = report.page.secureContext ? "supported" : "unsupported";
  secureState.textContent = report.page.secureContext ? "SECURE" : "NOT SECURE";

  const certificateNote = requiredElement<HTMLParagraphElement>("certificate-note");
  certificateNote.textContent = report.page.secureContext
    ? "安全上下文已建立，可请求 WebXR 会话。"
    : "请从受信任的 HTTPS 地址访问；普通局域网 HTTP 无法启动 WebXR。";

  const score = supportScore(report);
  requiredElement<HTMLSpanElement>("readiness-score").textContent = String(score).padStart(2, "0");
  const circumference = 2 * Math.PI * 56;
  requiredElement<SVGCircleElement>("dial-progress").style.strokeDashoffset = String(
    circumference * (1 - score / 100),
  );
  requiredElement<HTMLElement>("readiness-label").textContent =
    score >= 80 ? "READY" : score >= 50 ? "PARTIAL" : "BLOCKED";
  requiredElement<HTMLParagraphElement>("readiness-copy").textContent =
    score >= 80
      ? "浏览器具备启动 Vision Pro 探针的基础条件。"
      : "仍有基础接口或安全条件尚未满足。";

  const sessionState = requiredElement<HTMLSpanElement>("session-state");
  const activeSession = report.session;
  sessionState.textContent = activeSession?.state.toUpperCase() ?? "IDLE";
  sessionState.dataset.state =
    activeSession?.state === "active"
      ? "supported"
      : activeSession?.state === "error"
        ? "error"
        : "unknown";

  renderInputs(report);
  renderEvents(report);
  renderExperiences(report);
  renderPreferences(report);
  requiredElement<HTMLElement>("build-label").textContent = `BUILD ${report.buildId}`;
}

function persistAndApplyPreferences(eventDetail?: string): void {
  localStorage.setItem(preferenceStorageKey, JSON.stringify(preferences));
  document.documentElement.dataset.reducedMotion = String(preferences.reducedMotion);
  probeScene.setExperiencePreferences(
    renderProfileScale[preferences.renderProfile],
    preferences.reducedMotion,
  );
  if (eventDetail) {
    reportStore?.addEvent("experience-preference", eventDetail);
  }
  if (reportStore) {
    renderPreferences(reportStore.snapshot);
  }
}

function renderPreferences(report: CapabilityReport | null): void {
  const active = Boolean(sessionProbe?.active);
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-render-profile]")) {
    const profile = button.dataset.renderProfile as RenderProfile;
    button.dataset.active = String(profile === preferences.renderProfile);
    button.setAttribute("aria-pressed", String(profile === preferences.renderProfile));
    button.disabled = active;
  }
  reducedMotionButton.setAttribute("aria-pressed", String(preferences.reducedMotion));
  guidedModeButton.setAttribute("aria-pressed", String(preferences.guidedMode));
  reducedMotionButton.disabled = active;
  guidedModeButton.disabled = active;
  requiredElement<HTMLElement>("frame-budget").textContent =
    report?.frameMetrics.p95Ms === null || report?.frameMetrics.p95Ms === undefined
      ? `${Math.round(renderProfileScale[preferences.renderProfile] * 100)}% SCALE · P95 --`
      : `${Math.round(renderProfileScale[preferences.renderProfile] * 100)}% SCALE · P95 ${report.frameMetrics.p95Ms.toFixed(1)} MS`;
}

function availabilityLabel(availability: ExperienceAvailability): string {
  const labels: Record<ExperienceAvailability, string> = {
    available: "可进入原型",
    "coming-soon": "开发中",
    unsupported: "当前设备不支持",
  };
  return labels[availability];
}

function renderExperiences(report: CapabilityReport): void {
  const nextRenderKey = experienceRegistry
    .map((experience) => `${experience.id}:${experienceAvailability(experience, report)}`)
    .join("|");
  if (experienceRenderKey === nextRenderKey) {
    return;
  }

  experienceRenderKey = nextRenderKey;
  spatialSetController?.dispose();
  spatialSetController = null;
  experienceList.innerHTML = experienceRegistry
    .map((experience) => {
      const availability = experienceAvailability(experience, report);
      const kindLabel =
        experience.kind === "shared"
          ? "QUEST + VISION PRO"
          : experience.kind === "visionos-enhanced"
            ? "VISIONOS 27"
            : "QUEST ENHANCED";
      return `
        <article class="experience-card" data-kind="${experience.kind}" data-accent="${experience.accent}" data-availability="${availability}">
          <div class="experience-card__orbit" aria-hidden="true">
            <span>${experience.index}</span>
          </div>
          <div class="experience-card__body">
            <div class="experience-card__meta">
              <span>${kindLabel}</span>
              <span>${experience.durationMinutes} MIN · ${experience.comfort === "stationary" ? "原地舒适" : "房间尺度"}</span>
            </div>
            <h3>${experience.title}</h3>
            <small>${experience.englishTitle}</small>
            <p>${experience.description}</p>
          </div>
          ${
            experience.id === "spatial-set"
              ? `
                <div id="spatial-set-root" class="spatial-set" data-immersive="false">
                  <model
                    id="spatial-set-model"
                    class="spatial-set__model"
                    src="/assets/spatial-set/orbital-courtyard-optimized.usdz"
                    stagemode="orbit"
                    aria-label="轨道庭院三维空间布景"
                  >
                    <img
                      src="/assets/spatial-set/orbital-courtyard.svg"
                      alt="轨道庭院：薄荷色与琥珀色拱门围绕中央平台"
                    />
                  </model>
                  <div class="spatial-set__console">
                    <p id="spatial-set-status" data-state="loading">正在检查 HTML Model 与沉浸接口…</p>
                    <div class="spatial-set__actions">
                      <button id="spatial-set-enter" class="spatial-set__button" disabled>
                        进入空间布景 <span aria-hidden="true">↗</span>
                      </button>
                      <button id="spatial-set-exit" class="spatial-set__button" hidden>
                        退出空间布景 <span aria-hidden="true">↙</span>
                      </button>
                      <a
                        class="spatial-set__asset-link"
                        href="/assets/spatial-set/orbital-courtyard-optimized.usdz"
                        download
                      >USDZ · 3.7 KB</a>
                    </div>
                  </div>
                </div>
              `
              : ""
          }
          <div class="experience-card__state">
            <i aria-hidden="true"></i>
            ${availabilityLabel(availability)}
          </div>
        </article>
      `;
    })
    .join("");

  const spatialSetRoot = document.getElementById("spatial-set-root");
  if (spatialSetRoot) {
    spatialSetController = new SpatialSetController(spatialSetRoot, {
      onEvent: (type, detail) => reportStore?.addEvent(type, detail),
      onNotice: (message, state) => setNotice(message, state),
    });
  }
}

function renderInputs(report: CapabilityReport): void {
  requiredElement<HTMLSpanElement>("input-count").textContent = String(
    report.inputSources.length,
  ).padStart(2, "0");

  if (report.inputSources.length === 0) {
    inputSources.innerHTML = `
      <div class="empty-signal">
        <span aria-hidden="true"></span>
        ${report.session?.state === "active" ? "会话已激活，等待捏合或手部授权" : "进入沉浸会话后等待输入源"}
      </div>
    `;
    return;
  }

  inputSources.innerHTML = report.inputSources
    .map(
      (source) => `
        <div class="input-source">
          <span class="hand-mark hand-mark--${source.handedness || "none"}" aria-hidden="true"></span>
          <div>
            <strong>${source.id} / ${source.handedness.toUpperCase() || "NONE"}</strong>
            <small>${source.targetRayMode} · ${source.hasHand ? `${source.handJointCount} JOINTS` : "NO HAND"} · ${source.hasGripSpace ? "GRIP" : "NO GRIP"}</small>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderEvents(report: CapabilityReport): void {
  const recentEvents = report.events.slice(-8).reverse();
  eventLog.innerHTML = recentEvents
    .map((event) => {
      const time = new Date(event.at).toLocaleTimeString("zh-CN", { hour12: false });
      return `
        <li>
          <time>${time}</time>
          <span><strong>${event.type}</strong>${event.detail}</span>
        </li>
      `;
    })
    .join("");
}

async function scan(): Promise<void> {
  rescan.disabled = true;
  setNotice("正在扫描浏览器、会话模式和 visionOS 27 空间接口。");

  try {
    const report = await createCapabilityReport();
    reportStore = new ReportStore(report);
    sessionProbe = new XRSessionProbe(probeScene, reportStore);
    sessionProbe.addEventListener("sessionend", () => {
      setNotice("沉浸会话已退出，正在自动把报告保存至 Mac。");
      void saveReportToMac();
    });
    reportStore.addEventListener("change", () => renderReport(reportStore!.snapshot));
    renderReport(report);

    if (!report.page.secureContext) {
      setNotice("当前不是受信任的 HTTPS 安全上下文，WebXR 会话按钮已锁定。", "unsupported");
    } else if (report.webxr.immersiveVR.state === "supported") {
      setNotice("基础扫描通过。戴上 Vision Pro 后可启动 VR 探针。", "supported");
      window.setTimeout(() => void prewarmIntroExperience(), 350);
    } else {
      setNotice("浏览器已扫描，但 immersive-vr 当前未报告支持。", "unsupported");
    }
  } catch (error) {
    setNotice(error instanceof Error ? error.message : String(error), "error");
  } finally {
    rescan.disabled = false;
  }
}

async function startSession(mode: XRSessionMode): Promise<void> {
  if (!sessionProbe || !reportStore) {
    return;
  }

  launchVR.disabled = true;
  launchAR.disabled = true;
  setNotice(`正在请求 ${mode} 与可选的 hand-tracking 权限。`);

  try {
    await sessionProbe.start(mode);
    setNotice(
      mode === "immersive-ar"
        ? "Quest MR 实验场已启动。缓慢看向桌面或地面，圆环稳定后捏合放置。"
        : preferences.guidedMode
          ? "沉浸 Hub 已启动。按 01–05 顺序进入，或直接注视任一门户并捏合。"
          : "沉浸 Hub 已启动。注视任一门户并捏合进入。",
      "supported",
    );
  } catch (error) {
    setNotice(
      error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      "error",
    );
    renderReport(reportStore.snapshot);
  }
}

function exportJSON(): void {
  if (!reportStore) {
    return;
  }
  reportStore.refreshGeneratedAt();
  const report = reportStore.snapshot;
  const content = JSON.stringify(report, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replaceAll(":", "-");
  link.href = url;
  link.download = `webxr-lab-report-${stamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
  reportStore.addEvent("report-exported", link.download);
  setNotice("JSON 诊断报告已生成。", "supported");
}

async function saveReportToMac(): Promise<void> {
  if (!reportStore) {
    return;
  }

  saveReport.disabled = true;
  reportStore.refreshGeneratedAt();
  try {
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(reportStore.snapshot),
    });
    const result = (await response.json()) as {
      ok: boolean;
      filename?: string;
      error?: string;
    };
    if (!response.ok || !result.ok || !result.filename) {
      throw new Error(result.error ?? `Report receiver returned HTTP ${response.status}.`);
    }

    reportStore.addEvent("report-saved-to-mac", result.filename);
    setNotice(`报告已保存到 Mac：${result.filename}`, "supported");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reportStore.addEvent("report-save-error", message);
    setNotice(`无法保存至 Mac：${message}`, "error");
  } finally {
    saveReport.disabled = false;
  }
}

async function renderQRCode(): Promise<void> {
  await QRCode.toCanvas(qrCanvas, window.location.href, {
    width: 164,
    margin: 1,
    color: {
      dark: "#07110fff",
      light: "#bafbe5ff",
    },
    errorCorrectionLevel: "M",
  });
}

launchVR.addEventListener("click", () => void startSession("immersive-vr"));
launchAR.addEventListener("click", () => void startSession("immersive-ar"));
rescan.addEventListener("click", () => void scan());
exportReport.addEventListener("click", exportJSON);
saveReport.addEventListener("click", () => void saveReportToMac());
copyLink.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    setNotice("头显访问地址已复制。", "supported");
  } catch {
    setNotice("无法访问剪贴板，请手动复制页面地址。", "error");
  }
});

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-render-profile]")) {
  button.addEventListener("click", () => {
    preferences = {
      ...preferences,
      renderProfile: button.dataset.renderProfile as RenderProfile,
    };
    persistAndApplyPreferences(`renderProfile=${preferences.renderProfile}`);
  });
}
reducedMotionButton.addEventListener("click", () => {
  preferences = { ...preferences, reducedMotion: !preferences.reducedMotion };
  persistAndApplyPreferences(`reducedMotion=${preferences.reducedMotion}`);
});
guidedModeButton.addEventListener("click", () => {
  preferences = { ...preferences, guidedMode: !preferences.guidedMode };
  persistAndApplyPreferences(`guidedMode=${preferences.guidedMode}`);
});
showOnboardingButton.addEventListener("click", () => onboarding.showModal());
onboarding.addEventListener("close", () => {
  if (onboarding.returnValue === "start" || onboardingRemember.checked) {
    preferences = { ...preferences, onboardingCompleted: onboardingRemember.checked };
    persistAndApplyPreferences("onboarding-completed");
  }
});

setInterval(() => {
  requiredElement<HTMLSpanElement>("clock").textContent = new Date().toLocaleTimeString("zh-CN", {
    hour12: false,
  });
}, 1000);

void renderQRCode();
persistAndApplyPreferences();
if (!preferences.onboardingCompleted) {
  onboarding.showModal();
}
void scan();
