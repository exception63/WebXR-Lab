export type RenderProfile = "performance" | "balanced" | "fidelity";

export interface ExperiencePreferences {
  renderProfile: RenderProfile;
  reducedMotion: boolean;
  guidedMode: boolean;
  onboardingCompleted: boolean;
}

export const renderProfileScale: Record<RenderProfile, number> = {
  performance: 0.72,
  balanced: 0.85,
  fidelity: 1,
};

export function parsePreferences(
  raw: string | null,
  prefersReducedMotion: boolean,
): ExperiencePreferences {
  const fallback: ExperiencePreferences = {
    renderProfile: "balanced",
    reducedMotion: prefersReducedMotion,
    guidedMode: true,
    onboardingCompleted: false,
  };
  if (!raw) {
    return fallback;
  }

  try {
    const value = JSON.parse(raw) as Partial<ExperiencePreferences>;
    const validProfile =
      value.renderProfile === "performance" ||
      value.renderProfile === "balanced" ||
      value.renderProfile === "fidelity";
    return {
      renderProfile: validProfile ? value.renderProfile! : fallback.renderProfile,
      reducedMotion:
        typeof value.reducedMotion === "boolean" ? value.reducedMotion : fallback.reducedMotion,
      guidedMode: typeof value.guidedMode === "boolean" ? value.guidedMode : fallback.guidedMode,
      onboardingCompleted:
        typeof value.onboardingCompleted === "boolean"
          ? value.onboardingCompleted
          : fallback.onboardingCompleted,
    };
  } catch {
    return fallback;
  }
}
