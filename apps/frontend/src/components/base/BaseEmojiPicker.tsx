import { useState } from "react";

import { cn } from "@/lib/utils";

const EMOJI_GROUPS = [
  {
    label: "Organization",
    emojis: ["📋", "✅", "📝", "📌", "📁", "🗂️", "📅", "⏰", "💡", "🎯", "⭐", "🔥"],
  },
  {
    label: "Entretenimento",
    emojis: ["🎮", "🕹️", "🎲", "🏆", "🎬", "🍿", "📺", "🎧", "🎵", "🎤", "📚", "🎨"],
  },
  {
    label: "Comunidade",
    emojis: ["👥", "💬", "❤️", "🎉", "🎁", "🤝", "👑", "💎", "🚀", "⚡", "🌟", "✨"],
  },
  {
    label: "Jogos",
    emojis: ["⚔️", "🛡️", "🏹", "🧙", "🐉", "👾", "🤖", "💀", "🔫", "🏎️", "⚽", "🏀"],
  },
  {
    label: "Objetos",
    emojis: ["💻", "🖥️", "📱", "⌨️", "🖱️", "📷", "🔔", "🔑", "🔒", "🧰", "🧪", "🔧"],
  },
  {
    label: "Natureza",
    emojis: ["🌙", "☀️", "🌈", "☁️", "🌊", "🌲", "🌸", "🍀", "🐱", "🐶", "🦊", "🐼"],
  },
] as const;

type Props = { onSelect(emoji: string): void; value: string };

export function BaseEmojiPicker({ onSelect, value }: Props) {
  const [group, setGroup] = useState(0);
  const selectedGroup = EMOJI_GROUPS[group] ?? EMOJI_GROUPS[0];
  return (
    <div className="w-72 overflow-hidden rounded-2xl border border-border-strong bg-popover shadow-[var(--shadow-float)]">
      <div
        className="flex gap-1 overflow-x-auto border-b border-border p-2"
        role="tablist"
        aria-label="Emoji categories"
      >
        {EMOJI_GROUPS.map((item, index) => (
          <button
            key={item.label}
            type="button"
            role="tab"
            aria-selected={group === index}
            title={item.label}
            onClick={() => setGroup(index)}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg text-base transition-colors",
              group === index ? "bg-accent" : "hover:bg-accent/60",
            )}
          >
            {item.emojis[0]}
          </button>
        ))}
      </div>
      <div className="max-h-52 overflow-y-auto overscroll-contain p-3" tabIndex={0}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {selectedGroup.label}
        </p>
        <div className="grid grid-cols-6 gap-1">
          {selectedGroup.emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`Selecionar ${emoji}`}
              aria-pressed={value === emoji}
              onClick={() => onSelect(emoji)}
              className={cn(
                "flex size-9 items-center justify-center rounded-lg text-xl transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                value === emoji && "bg-accent ring-1 ring-border-strong",
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
