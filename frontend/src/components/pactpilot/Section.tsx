import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  id: string;
  icon: ReactNode;
  iconTint?: string;
  title: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Section({ id, icon, iconTint = "var(--accent)", title, badge, defaultOpen, children }: Props) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);
  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!contentEl) return;
    if (open) {
      setHeight(contentEl.scrollHeight);
      const t = setTimeout(() => setHeight(undefined), 220);
      return () => clearTimeout(t);
    } else {
      setHeight(contentEl.scrollHeight);
      requestAnimationFrame(() => setHeight(0));
    }
  }, [open, contentEl]);

  const panelId = `${id}-panel`;
  return (
    <section className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/60 transition-colors"
      >
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: iconTint, color: "var(--accent-foreground)" }}
        >
          {icon}
        </span>
        <span className="flex-1 font-semibold tracking-tight">{title}</span>
        {badge}
        <ChevronDown
          size={18}
          className="text-tertiary transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <div
        id={panelId}
        style={{
          height: height === undefined ? "auto" : `${height}px`,
          opacity: open ? 1 : 0,
          transition: "height 200ms ease-out, opacity 180ms ease-out",
          overflow: "hidden",
        }}
      >
        <div ref={setContentEl} className="px-5 pb-5 pt-1 border-t border-border">
          {children}
        </div>
      </div>
    </section>
  );
}
