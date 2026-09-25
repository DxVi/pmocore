import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  code?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, code, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
      <div className="min-w-0">
        {code && <div className="text-secondary small fw-semibold">{code}</div>}
        <h1 className="h3 mb-1 text-break">{title}</h1>
        {subtitle && <div className="text-secondary">{subtitle}</div>}
      </div>
      {actions && <div className="d-flex flex-wrap gap-2 pmo-page-actions">{actions}</div>}
    </header>
  );
}
