import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bug, Gift, LayoutGrid, ListTodo, Radio, Settings, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TodoTab } from "./TodoTab";
import { TournamentsTab } from "./TournamentsTab";
import { GiveawaysTab } from "./GiveawaysTab";
import { SettingsDialog } from "./SettingsDialog";
import { LiveControlTab } from "./LiveControlTab";
import { LivePlatformSelector } from "./LivePlatformSelector";
import { LiveSelectionProvider, useLiveSelection } from "@/modules/live-control/use-live-control";
import { getDesktopBridge } from "@/infrastructure/desktop-bridge";
import { Toaster } from "@/components/ui/sonner";
import { NotificationsCenter } from "./NotificationsCenter";
import { GuideModal } from "./GuideModal";
import { GUIDE_CLOSE_MODALS_EVENT } from "@/modules/guide/guide-state";
import { GUIDE_COMPLETED_STORAGE_KEY } from "@/modules/guide/guide-state";

type Tab = "live" | "todo" | "giveaways" | "tournaments";

const tabs: { id: Tab; labelKey: string; descriptionKey: string; icon: typeof ListTodo }[] = [
  {
    id: "live",
    labelKey: "navigation.live",
    descriptionKey: "navigation.liveDescription",
    icon: Radio,
  },
  {
    id: "todo",
    labelKey: "navigation.todo",
    descriptionKey: "navigation.todoDescription",
    icon: ListTodo,
  },
  {
    id: "giveaways",
    labelKey: "navigation.giveaways",
    descriptionKey: "navigation.giveawaysDescription",
    icon: Gift,
  },
  {
    id: "tournaments",
    labelKey: "navigation.tournaments",
    descriptionKey: "navigation.tournamentsDescription",
    icon: Swords,
  },
];

export function AppShell() {
  return (
    <LiveSelectionProvider>
      <AppShellContent />
    </LiveSelectionProvider>
  );
}

function AppShellContent() {
  const { t } = useTranslation();
  const live = useLiveSelection();
  const [tab, setTab] = useState<Tab>("live");
  const [settings, setSettings] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  useEffect(() => {
    if (!window.localStorage.getItem(GUIDE_COMPLETED_STORAGE_KEY)) setGuideOpen(true);
  }, []);
  useEffect(() => {
    const closeModals = () => {
      setSettings(false);
      setLauncherOpen(false);
    };
    window.addEventListener(GUIDE_CLOSE_MODALS_EVENT, closeModals);
    return () => window.removeEventListener(GUIDE_CLOSE_MODALS_EVENT, closeModals);
  }, []);
  useEffect(() => {
    if (!window.streamlet?.onFullscreenState) return;
    const updateFullscreen = () => {
      const nativeFullscreen =
        window.outerWidth >= window.screen.width && window.outerHeight >= window.screen.height;
      setFullscreen(document.fullscreenElement !== null || nativeFullscreen);
    };
    const removeBridgeListener = getDesktopBridge().onFullscreenState(setFullscreen);
    updateFullscreen();
    window.addEventListener("resize", updateFullscreen);
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => {
      removeBridgeListener();
      window.removeEventListener("resize", updateFullscreen);
      document.removeEventListener("fullscreenchange", updateFullscreen);
    };
  }, []);

  return (
    <main className="h-screen w-screen overflow-hidden">
      <div className="flex h-full w-full flex-col overflow-hidden bg-background">
        <header className="streamlet-titlebar h-10 shrink-0 border-b border-border">
          <div
            className={cn(
              "streamlet-titlebar__content relative flex h-full items-center gap-4",
              fullscreen && "streamlet-titlebar__content--fullscreen",
            )}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-full w-10 rounded-none"
              aria-label={t("navigation.openModules")}
              onClick={() => setLauncherOpen(true)}
              id="streamlet-home-launcher-button"
            >
              <LayoutGrid />
            </Button>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2">
              <img src="./assets/streamlet-icon.png" alt="" className="size-5 object-contain" />
              <span className="text-xs font-semibold tracking-wide text-foreground">Streamlet</span>
            </div>

            <div className="streamlet-titlebar__interactive ml-auto flex h-full items-center gap-1.5">
              <LivePlatformSelector
                streams={live.streams}
                selectedId={live.selectedId}
                onSelect={live.select}
              />
              <NotificationsCenter />
              {import.meta.env.DEV && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-full w-10 rounded-none"
                  aria-label={t("guide.openDebug")}
                  title={t("guide.openDebug")}
                  onClick={() => setGuideOpen(true)}
                >
                  <Bug />
                </Button>
              )}
              <Button
                id="settings-menu-trigger"
                variant="ghost"
                size="icon-sm"
                className="h-full w-10 rounded-none"
                aria-label={t("navigation.openSettings")}
                onClick={() => setSettings(true)}
              >
                <Settings />
              </Button>
            </div>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          {tabs.map((tabItem, index) => {
            const activeIndex = tabs.findIndex((item) => item.id === tab);
            return (
              <div
                key={tabItem.id}
                aria-hidden={tab !== tabItem.id}
                inert={tab !== tabItem.id ? true : undefined}
                style={{
                  transform: `translate3d(${index === activeIndex ? 0 : index < activeIndex ? -100 : 100}%, 0, 0)`,
                }}
                className={cn(
                  "absolute inset-0 flex min-h-0 flex-col transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] will-change-transform motion-reduce:transition-none",
                  index === activeIndex ? "z-10" : "pointer-events-none",
                )}
              >
                {tabItem.id === "todo" && <TodoTab />}
                {tabItem.id === "tournaments" && <TournamentsTab />}
                {tabItem.id === "giveaways" && <GiveawaysTab />}
                {tabItem.id === "live" && <LiveControlTab />}
              </div>
            );
          })}
        </div>
      </div>

      <SettingsDialog open={settings} onOpenChange={setSettings} />
      <GuideModal
        open={guideOpen}
        onOpenChange={(nextOpen) => {
          setGuideOpen(nextOpen);
          if (!nextOpen) window.localStorage.setItem(GUIDE_COMPLETED_STORAGE_KEY, "true");
        }}
      />
      <Toaster position="bottom-right" />
      <Dialog open={launcherOpen} onOpenChange={setLauncherOpen}>
        <DialogContent
          id="streamlet-home-launcher-modal"
          className={cn(
            "max-w-2xl border-border-strong bg-background/95 p-6 shadow-[var(--shadow-float)] backdrop-blur-3xl sm:rounded-2xl",
          )}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <LayoutGrid className="size-4 text-primary" />
              {t("navigation.modules")}
            </DialogTitle>
            <DialogDescription>{t("navigation.chooseModule")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {tabs.map((tabItem) => (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => {
                  setTab(tabItem.id);
                  setLauncherOpen(false);
                }}
                id={`streamlet-module-${tabItem.id}`}
                className={cn(
                  "group flex min-h-32 flex-col items-start justify-between rounded-2xl border p-4 text-left transition-all duration-200",
                  "border-border bg-surface-2/40 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  tab === tabItem.id && "border-primary/60 bg-primary/10",
                )}
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-background/80 text-muted-foreground transition-colors group-hover:text-primary">
                  <tabItem.icon className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    {t(tabItem.labelKey)}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t(tabItem.descriptionKey)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
