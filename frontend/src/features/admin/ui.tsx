"use client";

/**
 * Admin primitives.
 *
 * Every one is a thin wrapper over the `.sfa-*` classes in
 * `src/styles/admin.css`. Screens compose these and never write a colour, a
 * radius or a spacing value of their own — that is what keeps thirteen admin
 * pages looking like one product.
 */

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Info, Inbox, XCircle } from "lucide-react";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ page -- */

export function PageHead({
  title,
  description,
  actions,
  badge,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <header className="sfa-page-head">
      <div className="sfa-page-head__text">
        <h1 className="sfa-h1">
          {title}
          {badge}
        </h1>
        {description ? <p className="sfa-page-head__desc">{description}</p> : null}
      </div>
      {actions ? <div className="sfa-page-head__actions">{actions}</div> : null}
    </header>
  );
}

/* ------------------------------------------------------------------ card -- */

export function Card({
  title,
  description,
  actions,
  children,
  footer,
  flush = false,
  className = "",
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Drop the body padding — for tables that should meet the card edge. */
  flush?: boolean;
  className?: string;
}) {
  return (
    <section className={`sfa-card ${className}`}>
      {title ? (
        <div className="sfa-card__head">
          <div className="sfa-card__title">
            {title}
            {description ? <div className="sfa-card__desc">{description}</div> : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className={flush ? "sfa-card__body sfa-card__body--flush" : "sfa-card__body"}>{children}</div>
      {footer ? <div className="sfa-card__foot">{footer}</div> : null}
    </section>
  );
}

/* --------------------------------------------------------------- buttons -- */

type ButtonProps = {
  children?: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm" | "icon";
  icon?: LucideIcon;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  icon: Icon,
  type = "button",
  disabled,
  onClick,
  title,
  className = "",
}: ButtonProps) {
  const sizeClass = size === "sm" ? " sfa-btn--sm" : size === "icon" ? " sfa-btn--icon" : "";
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={size === "icon" ? title : undefined}
      className={`sfa-btn sfa-btn--${variant}${sizeClass} ${className}`}
    >
      {Icon ? <Icon size={15} strokeWidth={2} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/* --------------------------------------------------------------- notices -- */

const NOTICE_ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
} as const;

export function Notice({
  tone = "info",
  title,
  children,
  actions,
}: {
  tone?: keyof typeof NOTICE_ICONS;
  title?: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const Icon = NOTICE_ICONS[tone];
  return (
    <div className={`sfa-notice sfa-notice--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon size={17} className="sfa-notice__icon" aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>
        {title ? <strong>{title}</strong> : null}
        {title && children ? " " : null}
        {children}
      </div>
      {actions}
    </div>
  );
}

/* ---------------------------------------------------------------- badges -- */

export function Badge({
  tone = "neutral",
  children,
  dot = false,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "accent";
  children: ReactNode;
  dot?: boolean;
}) {
  const toneClass = tone === "neutral" ? "" : ` sfa-badge--${tone}`;
  return (
    <span className={`sfa-badge${toneClass}`}>
      {dot ? <span className="sfa-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------- stats -- */

export function Stat({
  label,
  value,
  icon: Icon,
  foot,
  loading = false,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  foot?: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="sfa-stat">
      <div className="sfa-stat__top">
        {Icon ? (
          <span className="sfa-stat__icon">
            <Icon size={16} strokeWidth={2} aria-hidden="true" />
          </span>
        ) : null}
        <span className="sfa-stat__label">{label}</span>
      </div>
      {loading ? (
        <div className="sfa-skeleton" style={{ height: 28, width: "60%" }} />
      ) : (
        <div className="sfa-stat__value">{value}</div>
      )}
      {foot ? <div className="sfa-stat__foot">{foot}</div> : null}
    </div>
  );
}

/* ----------------------------------------------------------------- table -- */

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="sfa-table-wrap">
      <table className="sfa-table">{children}</table>
    </div>
  );
}

export function RowActions({ children }: { children: ReactNode }) {
  return <div className="sfa-row-actions">{children}</div>;
}

export function EmptyState({
  title,
  children,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  children?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="sfa-empty">
      <div className="sfa-empty__icon">
        <Icon size={20} aria-hidden="true" />
      </div>
      <p className="sfa-empty__title">{title}</p>
      {children ? <p className="sfa-empty__body">{children}</p> : null}
      {action ? <div style={{ marginBlockStart: 14 }}>{action}</div> : null}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div style={{ padding: 16, display: "grid", gap: 10 }}>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 12 }}>
          {Array.from({ length: columns }, (_, column) => (
            <div key={column} className="sfa-skeleton" style={{ height: 14 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- forms -- */

export function Field({
  label,
  help,
  error,
  htmlFor,
  children,
}: {
  label: ReactNode;
  help?: ReactNode;
  error?: string | null;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="sfa-field">
      <label className="sfa-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <p className="sfa-error">{error}</p> : help ? <p className="sfa-help">{help}</p> : null}
    </div>
  );
}

/** WordPress's settings layout: label column left, control column right. */
export function FormRow({
  label,
  help,
  error,
  htmlFor,
  children,
}: {
  label: ReactNode;
  help?: ReactNode;
  error?: string | null;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="sfa-form-row">
      <label className="sfa-label" htmlFor={htmlFor}>
        {label}
      </label>
      <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
        {children}
        {error ? <p className="sfa-error">{error}</p> : help ? <p className="sfa-help">{help}</p> : null}
      </div>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <label className="sfa-switch">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
      />
      <span className="sfa-switch__track" aria-hidden="true" />
      {label ? <span style={{ fontSize: 13.5 }}>{label}</span> : null}
    </label>
  );
}

/** WP's "All (12) | Pending (3)" strip above a list table. */
export function FilterBar<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="sfa-filters">
      {options.map((option, index) => (
        <span key={option.value} style={{ display: "inline-flex", alignItems: "center" }}>
          {index > 0 ? <span aria-hidden="true">|</span> : null}
          <button type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
            {option.label}
            {option.count === undefined ? null : <em> ({option.count})</em>}
          </button>
        </span>
      ))}
    </div>
  );
}

export function KeyValue({ rows }: { rows: Array<{ key: ReactNode; value: ReactNode }> }) {
  return (
    <dl className="sfa-kv">
      {rows.map((row, index) => (
        <div className="sfa-kv__row" key={index}>
          <dt className="sfa-kv__key">{row.key}</dt>
          <dd className="sfa-kv__value">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A responsive grid without reaching for Tailwind inside admin screens. */
export function Grid({
  min = 240,
  gap = 16,
  children,
  className = "",
}: {
  /** Minimum column width in px before the grid wraps. */
  min?: number;
  gap?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ display: "grid", gap, gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))` }}
    >
      {children}
    </div>
  );
}

export function Stack({ gap = 16, children }: { gap?: number; children: ReactNode }) {
  return <div style={{ display: "grid", gap }}>{children}</div>;
}
