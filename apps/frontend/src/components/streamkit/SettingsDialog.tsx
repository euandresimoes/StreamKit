import { useState } from "react";
import { Check, Download, MonitorCog, Palette, Plug, RefreshCw, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useIntegrations } from "@/modules/integration/use-integrations";
import { useSettings } from "@/modules/settings/use-settings";

type Section = "appearance" | "system" | "integrations" | "updates";

const nav: { id: Section; label: string; icon: typeof Palette; hint: string }[] = [
  { id: "appearance", label: "Aparência", icon: Palette, hint: "Tema e densidade" },
  { id: "system", label: "Sistema", icon: MonitorCog, hint: "Janela e inicialização" },
  { id: "integrations", label: "Integrações", icon: Plug, hint: "Chats ao vivo" },
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
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [beta, setBeta] = useState(false);
  const persisted = useSettings(open);
  const integrations = useIntegrations(open && section === "integrations");
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
                  Cadastre canais que poderão fornecer participantes para sorteios e torneios.
                </p>

                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface-2/60 p-4">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-[#9146ff]/15 text-[#a970ff]">
                    <Plug className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold">Twitch Chat</p>
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {integrations.twitchAuth?.configured
                        ? `Conectado como ${integrations.twitchAuth.login}`
                        : integrations.twitchAuth?.available
                          ? "Pronto para conectar"
                          : "Client ID da Twitch não configurado no build"}
                    </p>
                    {integrations.twitchDevice && (
                      <p className="mt-1 text-xs font-semibold tracking-widest text-primary">
                        Código: {integrations.twitchDevice.userCode}
                      </p>
                    )}
                  </div>
                  {integrations.twitchAuth?.configured ? (
                    <Button
                      variant="danger"
                      size="sm"
                      loading={integrations.busy}
                      onClick={() => void integrations.disconnectTwitch()}
                    >
                      Desconectar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      loading={integrations.busy}
                      disabled={!integrations.twitchAuth?.available}
                      onClick={() => void integrations.connectTwitch()}
                    >
                      Conectar
                    </Button>
                  )}
                </div>

                <div className="mt-3 rounded-2xl border border-border bg-surface-2/60 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
                      <Plug className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold">YouTube Live Chat</p>
                      <p className="truncate text-[11.5px] text-muted-foreground">
                        {integrations.youtubeAuth?.configured
                          ? "Autorizado · selecione uma transmissão ativa"
                          : integrations.youtubeAuth?.available
                            ? "Pronto para conectar"
                            : "Client ID do YouTube não configurado no build"}
                      </p>
                    </div>
                    {integrations.youtubeAuth?.configured ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={integrations.busy}
                          onClick={() => void integrations.discoverYouTubeBroadcasts()}
                        >
                          Buscar lives
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          loading={integrations.busy}
                          onClick={() => void integrations.disconnectYouTube()}
                        >
                          Desconectar
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        loading={integrations.busy}
                        disabled={!integrations.youtubeAuth?.available}
                        onClick={() => void integrations.connectYouTube()}
                      >
                        Conectar
                      </Button>
                    )}
                  </div>
                  {integrations.youtubeBroadcasts.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-border pt-3">
                      {integrations.youtubeBroadcasts.map((broadcast) => (
                        <div
                          key={broadcast.liveChatId}
                          className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">{broadcast.title}</p>
                            <p className="text-[10px] text-muted-foreground">Transmissão ativa</p>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void integrations.selectYouTubeBroadcast(broadcast)}
                          >
                            Usar chat
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {integrations.connections.map((connection) => (
                    <div
                      key={connection.id}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">
                          {connection.channelDisplayName}
                        </p>
                        <p className="text-[11px] capitalize text-muted-foreground">
                          {connection.provider} · {connection.status}
                        </p>
                        {connection.lastErrorCode && (
                          <p className="text-[10px] text-destructive">
                            {connection.lastErrorCode === "YOUTUBE_QUOTA_OR_PERMISSION_ERROR"
                              ? "Quota esgotada ou permissão insuficiente no YouTube"
                              : connection.lastErrorCode === "YOUTUBE_CHAT_ENDED"
                                ? "O chat desta transmissão foi encerrado"
                                : connection.lastErrorCode}
                          </p>
                        )}
                      </div>
                      {connection.status === "connected" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void integrations.stop(connection.id)}
                        >
                          Parar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={
                            (connection.provider === "twitch" &&
                              !integrations.twitchAuth?.configured) ||
                            (connection.provider === "youtube" &&
                              !integrations.youtubeAuth?.configured)
                          }
                          onClick={() => void integrations.start(connection.id)}
                        >
                          Iniciar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remover ${connection.channelDisplayName}`}
                        onClick={() => void integrations.remove(connection.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                  {!integrations.connections.length && (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      Nenhum canal cadastrado.
                    </p>
                  )}
                  {integrations.error && (
                    <p className="text-xs text-destructive">{integrations.error}</p>
                  )}
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
