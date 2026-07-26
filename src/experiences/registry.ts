import type { CapabilityReport } from "../probe/types";

export type ExperienceKind = "shared" | "visionos-enhanced" | "quest-enhanced";
export type ExperienceStage = "prototype" | "planned";
export type ExperienceCapability = "immersive-vr" | "immersive-ar" | "spatial-web";

export interface ExperienceManifest {
  id: string;
  index: string;
  title: string;
  englishTitle: string;
  description: string;
  kind: ExperienceKind;
  stage: ExperienceStage;
  required: ExperienceCapability[];
  comfort: "stationary" | "room-scale";
  durationMinutes: number;
  accent: "mint" | "blue" | "amber" | "coral";
}

export type ExperienceAvailability = "available" | "coming-soon" | "unsupported";

export const experienceRegistry: readonly ExperienceManifest[] = [
  {
    id: "gesture-prologue",
    index: "01",
    title: "手势序章",
    englishTitle: "GESTURE PROLOGUE",
    description: "用凝视、捏合与双手关节理解空间网页最基本的交互语言。",
    kind: "shared",
    stage: "prototype",
    required: ["immersive-vr"],
    comfort: "stationary",
    durationMinutes: 3,
    accent: "mint",
  },
  {
    id: "light-loom",
    index: "02",
    title: "光之织机",
    englishTitle: "LOOM OF LIGHT",
    description: "把手的运动变成可拉伸、缠绕与塑形的程序化光线。",
    kind: "shared",
    stage: "prototype",
    required: ["immersive-vr"],
    comfort: "stationary",
    durationMinutes: 4,
    accent: "blue",
  },
  {
    id: "kinetic-workshop",
    index: "03",
    title: "动力工坊",
    englishTitle: "KINETIC WORKSHOP",
    description: "通过抓取、弹簧、磁力和杠杆，测试网页中的空间物理感。",
    kind: "shared",
    stage: "prototype",
    required: ["immersive-vr"],
    comfort: "room-scale",
    durationMinutes: 5,
    accent: "coral",
  },
  {
    id: "pocket-universe",
    index: "04",
    title: "口袋宇宙",
    englishTitle: "POCKET UNIVERSE",
    description: "在双手之间托起一个微缩世界，改变它的时间、重力与尺度。",
    kind: "shared",
    stage: "prototype",
    required: ["immersive-vr"],
    comfort: "stationary",
    durationMinutes: 4,
    accent: "mint",
  },
  {
    id: "sound-garden",
    index: "05",
    title: "声音花园",
    englishTitle: "SOUND GARDEN",
    description: "拨动六颗空间音种，用头部转动听见 HRTF 方向、距离与短促回响。",
    kind: "shared",
    stage: "prototype",
    required: ["immersive-vr"],
    comfort: "stationary",
    durationMinutes: 4,
    accent: "blue",
  },
  {
    id: "resonance-room",
    index: "06",
    title: "共振室",
    englishTitle: "RESONANCE ROOM",
    description: "两台头显通过 Mac 局域网房间共同激发一个装置，断线时自动保留单机体验。",
    kind: "shared",
    stage: "prototype",
    required: ["immersive-vr"],
    comfort: "stationary",
    durationMinutes: 4,
    accent: "mint",
  },
  {
    id: "mr-lab",
    index: "QMR",
    title: "MR 实验场",
    englishTitle: "MIXED REALITY LAB",
    description: "在真实桌面与地面上扫描、锚定并组合固定预算的虚拟构件。",
    kind: "quest-enhanced",
    stage: "prototype",
    required: ["immersive-ar"],
    comfort: "room-scale",
    durationMinutes: 4,
    accent: "blue",
  },
  {
    id: "spatial-set",
    index: "V27",
    title: "空间布景",
    englishTitle: "SPATIAL SET",
    description: "从网页模型进入环绕 Safari 窗口展开的 visionOS 27 沉浸环境。",
    kind: "visionos-enhanced",
    stage: "prototype",
    required: ["spatial-web"],
    comfort: "stationary",
    durationMinutes: 3,
    accent: "amber",
  },
] as const;

export function experienceAvailability(
  manifest: ExperienceManifest,
  report: CapabilityReport,
): ExperienceAvailability {
  const hasRequiredCapabilities = manifest.required.every((capability) => {
    switch (capability) {
      case "immersive-vr":
        return report.webxr.immersiveVR.state === "supported";
      case "immersive-ar":
        return report.webxr.immersiveAR.state === "supported";
      case "spatial-web":
        return report.spatialWeb.requestImmersive;
    }
  });

  if (!hasRequiredCapabilities) {
    return "unsupported";
  }
  return manifest.stage === "prototype" ? "available" : "coming-soon";
}
