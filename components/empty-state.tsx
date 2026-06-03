import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  children
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-black/20 bg-white/60 p-6 text-center">
      <Icon className="mx-auto mb-3 size-8 text-coral" aria-hidden="true" />
      <h3 className="font-black text-ink">{title}</h3>
      <div className="mt-1 text-sm font-semibold text-muted">{children}</div>
    </div>
  );
}
