import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { BR, ES, US } from "country-flag-icons/react/3x2";
import { Bell, CheckCheck, Gift, ListTodo, Radio, Trophy } from "lucide-react";
import type { Locale, ThemePreference } from "@streamlet/contracts";
import { BaseBrandIcon } from "@/components/base/BaseBrandIcon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import i18n from "@/i18n";
import { useSettings } from "@/modules/settings/use-settings";
import { GUIDE_CLOSE_MODALS_EVENT, setGuideOpen } from "@/modules/guide/guide-state";

type GuidePosition = {
  targetId?: string;
  x?: number;
  y?: number;
};

export type GuideStep = {
  actions?: GuideAction[];
  backdropIgnoreIds?: string[];
  id: string;
  titleKey: string;
  descriptionKey: string;
  content?: ComponentType;
  position?: GuidePosition;
};

export type GuideAction = {
  type: "highlight" | "click" | "event";
  targetId?: string;
  delayMs?: number;
};

const languages: { value: Locale; labelKey: string; Flag: typeof US }[] = [
  { value: "en-US", labelKey: "guide.languageEnglish", Flag: US },
  { value: "pt-BR", labelKey: "guide.languagePortuguese", Flag: BR },
  { value: "es", labelKey: "guide.languageSpanish", Flag: ES },
];

const LANGUAGE_STORAGE_KEY = "streamlet:guide-language";
const THEME_STORAGE_KEY = "streamlet:guide-theme";

const themes: { value: ThemePreference; labelKey: string }[] = [
  { value: "dark", labelKey: "guide.themeDark" },
  { value: "light", labelKey: "guide.themeLight" },
  { value: "system", labelKey: "guide.themeSystem" },
];

const launcherFeatures = [
  { icon: Radio, labelKey: "guide.homeLive", descriptionKey: "guide.homeLiveDescription" },
  { icon: ListTodo, labelKey: "guide.homeTodo", descriptionKey: "guide.homeTodoDescription" },
  { icon: Gift, labelKey: "guide.homeGiveaways", descriptionKey: "guide.homeGiveawaysDescription" },
  {
    icon: Trophy,
    labelKey: "guide.homeTournaments",
    descriptionKey: "guide.homeTournamentsDescription",
  },
];

const liveProviders = [
  {
    provider: "twitch" as const,
    labelKey: "guide.providerTwitch",
    descriptionKey: "guide.providerTwitchDescription",
  },
  {
    provider: "youtube" as const,
    labelKey: "guide.providerYouTube",
    descriptionKey: "guide.providerYouTubeDescription",
  },
  {
    provider: "kick" as const,
    labelKey: "guide.providerKick",
    descriptionKey: "guide.providerKickDescription",
  },
];

export function GuideHomeLauncherContent() {
  const { t } = useTranslation(undefined, { i18n });

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {launcherFeatures.map(({ icon: Icon, labelKey, descriptionKey }) => (
        <div
          key={labelKey}
          className="border border-border bg-card/70 p-4 transition-colors hover:bg-surface-2"
        >
          <Icon className="mb-3 size-5 text-primary" aria-hidden="true" />
          <p className="text-xs font-semibold">{t(labelKey)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{t(descriptionKey)}</p>
        </div>
      ))}
    </div>
  );
}

export function GuideLiveSelectStreamContent() {
  const { t } = useTranslation(undefined, { i18n });

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {liveProviders.map(({ provider, labelKey, descriptionKey }) => (
        <div key={provider} className="border border-border bg-card/70 p-4">
          <BaseBrandIcon provider={provider} labelled className="mb-3 size-7" />
          <p className="text-xs font-semibold">{t(labelKey)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{t(descriptionKey)}</p>
        </div>
      ))}
    </div>
  );
}

export function GuideNotificationMenuContent() {
  const { t } = useTranslation(undefined, { i18n });

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="border border-border bg-card/70 p-4">
        <Bell className="mb-3 size-5 text-primary" aria-hidden="true" />
        <p className="text-xs font-semibold">{t("guide.notificationsOverview")}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t("guide.notificationsOverviewDescription")}
        </p>
      </div>
      <div className="border border-border bg-card/70 p-4">
        <ListTodo className="mb-3 size-5 text-primary" aria-hidden="true" />
        <p className="text-xs font-semibold">{t("guide.notificationsDetails")}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t("guide.notificationsDetailsDescription")}
        </p>
      </div>
      <div className="border border-border bg-card/70 p-4">
        <CheckCheck className="mb-3 size-5 text-primary" aria-hidden="true" />
        <p className="text-xs font-semibold">{t("guide.notificationsMarkRead")}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t("guide.notificationsMarkReadDescription")}
        </p>
      </div>
    </div>
  );
}

export const GUIDE_STEPS: GuideStep[] = [
  {
    id: "language",
    titleKey: "guide.languageTitle",
    descriptionKey: "guide.languageDescription",
  },
  {
    id: "theme",
    titleKey: "guide.themeTitle",
    descriptionKey: "guide.themeDescription",
  },
  {
    id: "home-launcher",
    titleKey: "guide.homeLauncherTitle",
    descriptionKey: "guide.homeLauncherDescription",
    content: GuideHomeLauncherContent,
    actions: [{ type: "highlight", targetId: "streamlet-home-launcher-button" }],
    backdropIgnoreIds: ["streamlet-home-launcher-button"],
    position: {
      targetId: "streamlet-home-launcher-button",
      x: 20,
      y: 17,
    },
  },
  {
    id: "live-select-stream",
    titleKey: "guide.liveSelectStreamTitle",
    descriptionKey: "guide.liveSelectStreamDescription",
    content: GuideLiveSelectStreamContent,
    actions: [{ type: "highlight", targetId: "live-select-stream" }],
    backdropIgnoreIds: ["live-select-stream"],
    position: {
      targetId: "live-select-stream",
      x: -17,
      y: 14,
    },
  },
  {
    id: "notification-menu-trigger",
    titleKey: "guide.notificationMenuTitle",
    descriptionKey: "guide.notificationMenuDescription",
    content: GuideNotificationMenuContent,
    actions: [{ type: "highlight", targetId: "notification-menu-trigger" }],
    backdropIgnoreIds: ["notification-menu-trigger"],
    position: {
      targetId: "notification-menu-trigger",
      x: -17,
      y: 14,
    },
  },
  {
    id: "settings-menu-trigger",
    titleKey: "guide.settingsMenuTriggerTitle",
    descriptionKey: "guide.settingsMenuTriggerDescription",
    actions: [{ type: "highlight", targetId: "settings-menu-trigger" }],
    backdropIgnoreIds: ["settings-menu-trigger"],
    position: {
      targetId: "settings-menu-trigger",
      x: -17,
      y: 10,
    },
  },
  {
    id: "settings-menu-modal",
    titleKey: "guide.settingsMenuModalTitle",
    descriptionKey: "guide.settingsMenuModalDescription",
    actions: [
      { type: "click", targetId: "settings-menu-trigger" },
      { type: "highlight", targetId: "settings-menu-modal" },
    ],
    backdropIgnoreIds: ["settings-menu-modal"],
    position: {
      targetId: "settings-menu-modal",
      x: 55,
      y: 40,
    },
  },
  {
    id: "settings-menu-tab-appearance",
    titleKey: "guide.settingsMenuTabAppearenceTitle",
    descriptionKey: "guide.settingsMenuTabAppearenceDescription",
    actions: [
      { type: "highlight", targetId: "settings-tab-appearance" },
      { type: "click", targetId: "settings-tab-appearance" },
    ],
    backdropIgnoreIds: ["settings-tab-appearance"],
    position: {
      targetId: "settings-tab-appearance",
      x: 30,
      y: 5.2,
    },
  },
  {
    id: "settings-menu-tab-system",
    titleKey: "guide.settingsMenuTabSystemTitle",
    descriptionKey: "guide.settingsMenuTabSystemDescription",
    actions: [
      { type: "highlight", targetId: "settings-tab-system" },
      { type: "click", targetId: "settings-tab-system" },
    ],
    backdropIgnoreIds: ["settings-tab-system"],
    position: {
      targetId: "settings-tab-system",
      x: 30,
      y: 5.2,
    },
  },
  {
    id: "settings-menu-tab-integrations",
    titleKey: "guide.settingsMenuTabIntegrationsTitle",
    descriptionKey: "guide.settingsMenuTabIntegrationsDescription",
    actions: [
      { type: "highlight", targetId: "settings-tab-integrations" },
      { type: "click", targetId: "settings-tab-integrations" },
    ],
    backdropIgnoreIds: ["settings-tab-integrations"],
    position: {
      targetId: "settings-tab-integrations",
      x: 30,
      y: 5.2,
    },
  },
  {
    id: "settings-menu-tab-integrations-details",
    titleKey: "guide.settingsMenuTabIntegrationsDetailsTitle",
    descriptionKey: "guide.settingsMenuTabIntegrationsDetailsDescription",
    actions: [
      { type: "click", targetId: "settings-tab-integrations" },
      { type: "highlight", targetId: "settings-menu-modal-main" },
    ],
    backdropIgnoreIds: ["settings-menu-modal-main"],
    position: {
      targetId: "settings-menu-modal-main",
      x: -16.5,
      y: 20,
    },
  },
  {
    id: "settings-menu-tab-updates",
    titleKey: "guide.settingsMenuTabUpdatesTitle",
    descriptionKey: "guide.settingsMenuTabUpdatesDescription",
    actions: [
      { type: "highlight", targetId: "settings-tab-updates" },
      { type: "click", targetId: "settings-tab-updates" },
    ],
    backdropIgnoreIds: ["settings-tab-updates"],
    position: {
      targetId: "settings-tab-updates",
      x: 30,
      y: 5.2,
    },
  },
  {
    id: "settings-menu-tab-updates-details",
    titleKey: "guide.settingsMenuTabUpdatesDetailsTitle",
    descriptionKey: "guide.settingsMenuTabUpdatesDetailsDescription",
    actions: [
      { type: "click", targetId: "settings-tab-updates" },
      { type: "highlight", targetId: "settings-menu-modal-main" },
    ],
    backdropIgnoreIds: ["settings-menu-modal-main"],
    position: {
      targetId: "settings-menu-modal-main",
      x: -16.5,
      y: 20,
    },
  },
  {
    id: "guide-end",
    titleKey: "guide.endTitle",
    descriptionKey: "guide.endDescription",
    actions: [{ type: "event", targetId: "close-modals" }],
    position: {
      x: 0,
      y: 0,
    },
  },
];

export function GuideModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation(undefined, { i18n });
  const persistedSettings = useSettings(open);
  const [stepIndex, setStepIndex] = useState(0);
  const [highlightedTargets, setHighlightedTargets] = useState<string[]>([]);
  const [language, setLanguage] = useState<Locale>(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === "pt-BR" || stored === "es" || stored === "en-US" ? stored : "en-US";
  });
  const [theme, setTheme] = useState<ThemePreference>(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" || stored === "light" || stored === "system" ? stored : "system";
  });
  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [language]);
  useEffect(() => {
    setGuideOpen(open);
    if (open) {
      document.body.dataset["streamletGuideOpen"] = "true";
      return () => {
        delete document.body.dataset["streamletGuideOpen"];
      };
    }
    delete document.body.dataset["streamletGuideOpen"];
    return undefined;
  }, [open]);
  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);
  useEffect(() => {
    if (!open || !persistedSettings.settings) return;
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const savedLanguage =
      storedLanguage === "pt-BR" || storedLanguage === "es" || storedLanguage === "en-US"
        ? storedLanguage
        : null;
    const savedTheme =
      storedTheme === "dark" || storedTheme === "light" || storedTheme === "system"
        ? storedTheme
        : null;
    const patch: { locale?: Locale; theme?: ThemePreference } = {
      ...(savedLanguage && persistedSettings.settings.locale !== savedLanguage
        ? { locale: savedLanguage }
        : {}),
      ...(savedTheme && persistedSettings.settings.theme !== savedTheme
        ? { theme: savedTheme }
        : {}),
    };
    if (Object.keys(patch).length > 0) void persistedSettings.update(patch);
  }, [open, persistedSettings.settings]);
  const defaultStep = GUIDE_STEPS[0]!;
  const step = GUIDE_STEPS[stepIndex] ?? defaultStep;
  const hasContent = Boolean(step.content);
  const spotlightMaskId = `guide-spotlight-mask-${step.id}`;
  const guideRef = useRef<HTMLDivElement>(null);
  const [anchoredPosition, setAnchoredPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  useLayoutEffect(() => {
    const position = step.position;
    if (!open || !position?.targetId) {
      setAnchoredPosition(null);
      return;
    }

    let frame = 0;
    const updatePosition = () => {
      const target = document.getElementById(position.targetId!);
      const guide = guideRef.current;
      if (!target || !guide) {
        frame = window.requestAnimationFrame(updatePosition);
        return;
      }

      const targetRect = target.getBoundingClientRect();
      const rootFontSize =
        Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const offsetX = (position.x ?? 0) * rootFontSize;
      const offsetY = (position.y ?? 0) * rootFontSize;
      const left = targetRect.left + offsetX;
      const top = targetRect.top + offsetY;

      setAnchoredPosition((current) =>
        current && Math.abs(current.left - left) < 0.5 && Math.abs(current.top - top) < 0.5
          ? current
          : { left, top },
      );
    };

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updatePosition);
    };

    updatePosition();
    const target = document.getElementById(position.targetId);
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    if (target) resizeObserver.observe(target);
    if (guideRef.current) resizeObserver.observe(guideRef.current);
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
    };
  }, [open, step]);

  const positionStyle = step.position?.targetId
    ? {
        left: anchoredPosition?.left ?? 0,
        top: anchoredPosition?.top ?? 0,
        transform: "none",
        visibility: anchoredPosition ? ("visible" as const) : ("hidden" as const),
      }
    : undefined;

  useEffect(() => {
    if (!open) {
      setHighlightedTargets([]);
      return;
    }
    let cancelled = false;
    const wait = (duration: number) =>
      new Promise<void>((resolve) => window.setTimeout(resolve, duration));
    const findTarget = async (targetId: string) => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const target = document.getElementById(targetId);
        if (target) return target;
        await wait(50);
      }
      return null;
    };
    const runActions = async () => {
      setHighlightedTargets([]);
      for (const action of step.actions ?? []) {
        if (cancelled) return;
        if (action.type === "event") {
          if (action.targetId === "close-modals") {
            window.dispatchEvent(new Event(GUIDE_CLOSE_MODALS_EVENT));
          }
          if (action.delayMs) await wait(action.delayMs);
          continue;
        }
        if (!action.targetId) continue;
        const targetId = action.targetId;
        const target = await findTarget(targetId);
        if (!target || cancelled) continue;
        if (action.type === "highlight") {
          setHighlightedTargets((current) =>
            current.includes(targetId) ? current : [...current, targetId],
          );
        } else {
          target.click();
        }
        if (action.delayMs) await wait(action.delayMs);
      }
    };
    void runActions();
    return () => {
      cancelled = true;
    };
  }, [open, step]);

  const [spotlightRects, setSpotlightRects] = useState<
    { id: string; left: number; top: number; width: number; height: number; highlighted: boolean }[]
  >([]);

  useEffect(() => {
    const ignoredIds = step.backdropIgnoreIds ?? [];
    const spotlightIds = [...new Set([...ignoredIds, ...highlightedTargets])];
    if (!open || !spotlightIds.length) {
      setSpotlightRects([]);
      return;
    }
    const update = () => {
      const nextRects = spotlightIds.flatMap((id) => {
        const element = document.getElementById(id);
        if (!element) return [];
        const rect = element.getBoundingClientRect();
        return [
          {
            id,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            highlighted: highlightedTargets.includes(id),
          },
        ];
      });
      setSpotlightRects((current) => {
        if (
          current.length === nextRects.length &&
          current.every((rect, index) => {
            const next = nextRects[index];
            return (
              next &&
              rect.id === next.id &&
              rect.left === next.left &&
              rect.top === next.top &&
              rect.width === next.width &&
              rect.height === next.height &&
              rect.highlighted === next.highlighted
            );
          })
        ) {
          return current;
        }
        return nextRects;
      });
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [highlightedTargets, open, step]);

  const selectLanguage = (value: Locale) => {
    setLanguage(value);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
    void i18n.changeLanguage(value);
    void persistedSettings.update({ locale: value });
  };

  const selectTheme = (value: ThemePreference) => {
    setTheme(value);
    window.localStorage.setItem(THEME_STORAGE_KEY, value);
    void persistedSettings.update({ theme: value });
  };

  const closeAllModals = () => {
    window.dispatchEvent(new Event(GUIDE_CLOSE_MODALS_EVENT));
  };
  const closeGuide = () => onOpenChange(false);
  const skipGuide = () => {
    closeAllModals();
    closeGuide();
  };
  const handleDialogOpenChange = (nextOpen: boolean) => {
    // Radix can emit false when another modal opens above this one. Only the
    // explicit Skip and close-button handlers are allowed to finish the guide.
    if (nextOpen) onOpenChange(true);
  };

  const next = () => {
    if (stepIndex >= GUIDE_STEPS.length - 1) closeGuide();
    else setStepIndex((current) => current + 1);
  };

  return (
    <Dialog open={open} modal={false} onOpenChange={handleDialogOpenChange}>
      {open &&
        createPortal(
          <div
            aria-hidden="true"
            className="pointer-events-auto fixed inset-0 z-[9999]"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <svg className="fixed inset-0 size-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <mask id={spotlightMaskId}>
                  <rect width="100%" height="100%" fill="white" />
                  {spotlightRects.map((rect) => (
                    <rect
                      key={rect.id}
                      x={rect.left}
                      y={rect.top}
                      width={rect.width}
                      height={rect.height}
                      fill="black"
                    />
                  ))}
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.65)"
                mask={`url(#${spotlightMaskId})`}
              />
            </svg>
            {spotlightRects.map(
              (rect) =>
                rect.highlighted && (
                  <span
                    key={rect.id}
                    className="pointer-events-none fixed z-[10001] box-border border-2 border-primary shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_45%,transparent),0_0_24px_-8px_var(--primary)]"
                    style={{
                      left: rect.left,
                      top: rect.top,
                      width: rect.width,
                      height: rect.height,
                    }}
                  />
                ),
            )}
          </div>,
          document.body,
        )}
      <DialogContent
        ref={guideRef}
        onClose={skipGuide}
        style={positionStyle}
        hideOverlay
        className="pointer-events-auto z-[10000] w-[min(860px,calc(100vw-1rem))] max-h-[calc(100vh-1rem)] gap-0 overflow-hidden rounded-3xl border-border-strong bg-popover/95 p-0 shadow-[var(--shadow-float)]"
      >
        <header
          className={hasContent ? "border-b border-border px-6 py-4 pr-12" : "px-6 py-4 pr-12"}
        >
          <DialogTitle
            className={hasContent ? "text-[15px] font-semibold" : "text-xl font-semibold"}
          >
            {t(step.titleKey)}
          </DialogTitle>
          <DialogDescription className={hasContent ? "mt-1 text-[11px]" : "mt-1 text-sm"}>
            {t(step.descriptionKey)}
          </DialogDescription>
        </header>
        <section className="min-h-0 overflow-y-auto p-6">
          <div className="space-y-5">
            {step.content ? (
              <step.content />
            ) : step.id === "language" ? (
              <div className="grid gap-2 sm:grid-cols-3">
                {languages.map(({ value, labelKey, Flag }) => (
                  <button
                    key={value}
                    type="button"
                    className={`border border-border bg-card p-4 text-left text-xs transition-colors ${language === value ? "border-primary bg-primary/10" : "hover:bg-surface-2"}`}
                    onClick={() => selectLanguage(value)}
                  >
                    <span className="flex items-center gap-2">
                      <Flag title={value} className="h-4 w-6 rounded-sm" />
                      {t(labelKey)}
                    </span>
                  </button>
                ))}
              </div>
            ) : step.id === "theme" ? (
              <div className="grid gap-2 sm:grid-cols-3">
                {themes.map(({ value, labelKey }) => (
                  <button
                    key={value}
                    type="button"
                    className={`border border-border bg-card p-4 text-left text-xs transition-colors ${theme === value ? "border-primary bg-primary/10" : "hover:bg-surface-2"}`}
                    onClick={() => selectTheme(value)}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={`size-4 rounded-sm border border-border-strong ${value === "dark" ? "bg-[#19191A]" : value === "light" ? "bg-[#F2EDF8]" : "bg-gradient-to-br from-[#19191A] from-50% to-[#F2EDF8] to-50%"}`}
                      />
                      {t(labelKey)}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            <footer className="flex items-center justify-between">
              <Button variant="ghost" onClick={skipGuide}>
                {t("guide.skip")}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  disabled={stepIndex === 0}
                  onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                >
                  {t("guide.back")}
                </Button>
                <Button onClick={next}>{t("guide.continue")}</Button>
              </div>
            </footer>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
