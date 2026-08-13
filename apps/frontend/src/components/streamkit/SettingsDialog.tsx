import { useState } from "react";
import {
  KeyRound,
  Zap,
  ShieldCheck,
  Palette,
  MonitorCog,
  Plug,
  RefreshCw,
  Check,
  Download,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useSettings } from "@/modules/settings/use-settings";

type Section = "appearance" | "system" | "integrations" | "updates";

const nav: { id: Section; label: string; icon: typeof Palette; hint: string }[] = [
  { id: "appearance", label: "Aparência", icon: Palette, hint: "Tema e densidade" },
  { id: "system", label: "Sistema", icon: MonitorCog, hint: "Janela e inicialização" },
  { id: "integrations", label: "Integrações", icon: Plug, hint: "LivePix API" },
  { id: "updates", label: "Atualizações", icon: RefreshCw, hint: "v0.4.0" },
];

const themes = [
  { id: "graphite", label: "Grafite quente", swatch: "oklch(0.24 0.006 70)" },
  { id: "black", label: "Preto neutro", swatch: "oklch(0.12 0 0)" },
  { id: "slate", label: "Grafite frio", swatch: "oklch(0.26 0.01 260)" },
];

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex-1">
        <p className="text-[13px] font-medium">{title}</p>
        {description && <p className="text-[11.5px] text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [section, setSection] = useState<Section>("appearance");
  const [density, setDensity] = useState(true);
  const [hardware, setHardware] = useState(true);
  const [key, setKey] = useState("");
  const [auto, setAuto] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [beta, setBeta] = useState(false);
  const persisted = useSettings(open);
  const theme = persisted.settings?.theme ?? "dark";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel max-w-[860px] gap-0 overflow-hidden rounded-3xl border-border-strong bg-popover/95 p-0">
        <DialogTitle className="sr-only">Configurações</DialogTitle>

        <div className="flex min-h-[460px]">
          {/* Aside */}
          <aside className="w-[220px] shrink-0 border-r border-border bg-surface-2/40 p-3">
            <p className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Configurações
            </p>
            <nav className="flex flex-col gap-0.5">
              {nav.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSection(n.id)}
                  className={cn(
                    "press flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors duration-200",
                    section === n.id
                      ? "bg-surface-2 text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <n.icon className="size-4" />
                  <span className="flex-1">
                    <span className="block text-[12.5px] font-medium">{n.label}</span>
                    <span className="block text-[10.5px] opacity-70">{n.hint}</span>
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Panel */}
          <section key={section} className="animate-sk-in min-w-0 flex-1 overflow-y-auto p-6">
            {section === "appearance" && (
              <div>
                <h3 className="text-[15px] font-semibold">Aparência</h3>
                <p className="text-[12px] text-muted-foreground">
                  Escolha o tema e o conforto visual para lives longas.
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() =>
                        void persisted.update({ theme: t.id === "black" ? "dark" : "system" })
                      }
                      className={cn(
                        "raise rounded-2xl border p-3 text-left",
                        (theme === "dark" && t.id === "black") ||
                          (theme === "system" && t.id !== "black")
                          ? "border-primary bg-surface-2/70"
                          : "border-border",
                      )}
                    >
                      <span
                        className="block h-12 w-full rounded-xl border border-border"
                        style={{ backgroundColor: t.swatch }}
                      />
                      <span className="mt-2 flex items-center gap-1 text-[12px] font-medium">
                        {t.label}
                        {((theme === "dark" && t.id === "black") ||
                          (theme === "system" && t.id === "graphite")) && (
                          <Check className="size-3 text-primary" />
                        )}
                      </span>
                    </button>
                  ))}
                </div>
                <Separator className="my-4" />
                <Row title="Modo compacto" description="Reduz espaçamentos das colunas do kanban.">
                  <Switch checked={density} onCheckedChange={setDensity} />
                </Row>
                <Row
                  title="Reduzir animações"
                  description="Desativa transições e a roleta animada."
                >
                  <Switch
                    checked={persisted.settings?.reduceMotion ?? false}
                    onCheckedChange={(value) => void persisted.update({ reduceMotion: value })}
                  />
                </Row>
              </div>
            )}

            {section === "system" && (
              <div>
                <h3 className="text-[15px] font-semibold">Sistema operacional</h3>
                <p className="text-[12px] text-muted-foreground">
                  Comportamento da janela e integração com o desktop.
                </p>
                <div className="mt-3 divide-y divide-border">
                  <Row title="Abrir com o sistema" description="Iniciar o StreamKit no login.">
                    <Switch
                      checked={persisted.settings?.openAtLogin ?? false}
                      onCheckedChange={(value) => void persisted.update({ openAtLogin: value })}
                    />
                  </Row>
                  <Row title="Manter na bandeja" description="Fechar minimiza para a tray.">
                    <Switch
                      checked={persisted.settings?.minimizeToTray ?? false}
                      onCheckedChange={(value) => void persisted.update({ minimizeToTray: value })}
                    />
                  </Row>
                  <Row title="Aceleração por hardware" description="Requer reiniciar o aplicativo.">
                    <Switch checked={hardware} onCheckedChange={setHardware} />
                  </Row>
                </div>
                <Separator className="my-4" />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => void persisted.openLogsDirectory()}>
                    Abrir pasta de logs
                  </Button>
                  <Button variant="danger">Resetar preferências</Button>
                </div>
              </div>
            )}

            {section === "integrations" && (
              <div>
                <h3 className="text-[15px] font-semibold">Integrações</h3>
                <p className="text-[12px] text-muted-foreground">
                  Conecte a LivePix para o modo automático de torneios e sorteios.
                </p>

                <div className="mt-4 rounded-2xl border border-border bg-surface-2/60 p-4">
                  <div className="flex items-center gap-2">
                    <KeyRound className="size-4 text-primary" />
                    <h4 className="flex-1 text-[13px] font-semibold">LivePix API Key</h4>
                    {persisted.credentialConfigured && (
                      <span className="flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                        <ShieldCheck className="size-3" /> Conectado
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Input
                      type="password"
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      placeholder="lp_live_••••••••••••"
                      className="h-9 font-mono text-[12.5px]"
                    />
                    <Button
                      loading={persisted.busy}
                      onClick={() => {
                        if (key.trim()) void persisted.saveCredential(key.trim());
                      }}
                    >
                      Salvar
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        setKey("");
                        void persisted.removeCredential();
                      }}
                    >
                      Limpar
                    </Button>
                  </div>
                  <p className="mt-2 text-[11.5px] text-muted-foreground">
                    A chave é armazenada localmente e nunca sai do seu computador.
                  </p>
                </div>

                <Separator className="my-4" />

                <div className="flex items-start gap-3">
                  <Zap className="mt-0.5 size-4 text-warning" />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium">Modo automático</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      Adicionar doadores automaticamente em torneios e sorteios (em breve).
                    </p>
                  </div>
                  <Switch checked={auto} onCheckedChange={setAuto} disabled />
                </div>
              </div>
            )}

            {section === "updates" && (
              <div>
                <h3 className="text-[15px] font-semibold">Atualizações</h3>
                <p className="text-[12px] text-muted-foreground">
                  Mantenha o StreamKit sempre na última versão.
                </p>

                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface-2/60 p-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)]">
                    <Download className="size-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold">Versão 0.4.0</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {checked ? "Você está atualizado." : "Última verificação: há 2 dias"}
                    </p>
                  </div>
                  <Button
                    loading={checking}
                    variant="secondary"
                    onClick={() => {
                      setChecking(true);
                      void persisted
                        .checkUpdates()
                        .then(() => setChecked(true))
                        .finally(() => setChecking(false));
                    }}
                  >
                    Verificar agora
                  </Button>
                </div>

                <div className="mt-3 divide-y divide-border">
                  <Row
                    title="Atualizar automaticamente"
                    description="Baixa e instala em segundo plano."
                  >
                    <Switch checked disabled />
                  </Row>
                  <Row title="Canal beta" description="Receber versões de teste antes de todos.">
                    <Switch checked={beta} onCheckedChange={setBeta} />
                  </Row>
                </div>

                <Separator className="my-4" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Novidades
                </p>
                <ul className="mt-2 space-y-1.5 text-[12px] text-muted-foreground">
                  <li>• Chaveamento adaptativo em torneios de equipe.</li>
                  <li>• Modo caixa nos sorteios com animação de física.</li>
                  <li>• Tema preto neutro para lives longas.</li>
                </ul>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
