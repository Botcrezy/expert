import { ReactNode } from "react";

type EditorialSectionHeaderProps = {
  kicker?: string;
  kickerIcon?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

export function EditorialSectionHeader({
  kicker,
  kickerIcon,
  title,
  subtitle,
  actions,
  className,
}: EditorialSectionHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 ${
        className || ""
      }`.trim()}
    >
      <div>
        {kicker && (
          <div className="inline-flex items-center gap-2 rounded-full bg-muted/60 text-foreground px-4 py-2 text-sm font-medium mb-3 border border-border/60">
            {kickerIcon}
            {kicker}
          </div>
        )}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
      </div>

      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
