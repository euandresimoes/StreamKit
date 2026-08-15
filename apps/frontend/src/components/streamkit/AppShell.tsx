import { useEffect, useState } from "react";
import { ListTodo, Swords, Gift, Settings, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TodoTab } from "./TodoTab";
import { GamesTab } from "./GamesTab";
import { GiveawaysTab } from "./GiveawaysTab";
import { SettingsDialog } from "./SettingsDialog";
import { useSettings } from "@/modules/settings/use-settings";
import { LiveControlTab } from "./LiveControlTab";
import { LivePlatformSelector } from "./LivePlatformSelector";
import { LiveSelectionProvider, useLiveSelection } from "@/modules/live-control/use-live-control";
import { getDesktopBridge } from "@/infrastructure/desktop-bridge";

type Tab = "todo" | "games" | "giveaways" | "live";

const tabs: { id: Tab; label: string; icon: typeof ListTodo }[] = [
  { id: "todo", label: "TODO", icon: ListTodo },
  { id: "games", label: "GAMES", icon: Swords },
  { id: "giveaways", label: "GIVEAWAYS", icon: Gift },
  { id: "live", label: "LIVE", icon: Radio },
];

export function AppShell() {
  return (
    <LiveSelectionProvider>
      <AppShellContent />
    </LiveSelectionProvider>
  );
}

function AppShellContent() {
  useSettings(true);
  const live = useLiveSelection();
  const [tab, setTab] = useState<Tab>("todo");
  const [settings, setSettings] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!window.streamkit?.onFullscreenState) return;
    return getDesktopBridge().onFullscreenState(setFullscreen);
  }, []);

  return (
    <main className="h-screen w-screen overflow-hidden">
      <div className="flex h-full w-full flex-col overflow-hidden bg-background/60 backdrop-blur-3xl">
        <header className="streamkit-titlebar h-10 shrink-0 border-b border-border">
          <div
            className={cn(
              "streamkit-titlebar__content flex h-full items-center gap-4",
              fullscreen && "streamkit-titlebar__content--fullscreen",
            )}
          >
            <nav className="streamkit-titlebar__interactive flex gap-1">
              {tabs.map((tabItem) => (
                <button
                  key={tabItem.id}
                  onClick={() => setTab(tabItem.id)}
                  className={cn(
                    "press flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-[12px] font-semibold tracking-wide transition-all duration-300",
                    tab === tabItem.id
                      ? "bg-surface-2 text-foreground shadow-[0_1px_0_0_oklch(1_0_0/8%)_inset]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <tabItem.icon className="size-3.5" />
                  {tabItem.label}
                </button>
              ))}
            </nav>

            <div className="streamkit-titlebar__interactive ml-auto flex items-center gap-1.5">
              <LivePlatformSelector
                streams={live.streams}
                selectedId={live.selectedId}
                onSelect={live.select}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Abrir configurações"
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
                {tabItem.id === "games" && <GamesTab />}
                {tabItem.id === "giveaways" && <GiveawaysTab />}
                {tabItem.id === "live" && <LiveControlTab />}
              </div>
            );
          })}
        </div>
      </div>

      <SettingsDialog open={settings} onOpenChange={setSettings} />
    </main>
  );
}
