import { ArrowRight, CircleAlert, Sparkles } from "lucide-react";
import Link from "next/link";

export function StatusPill({ status }: { status: string }) {
  const tone = status.toLowerCase().replaceAll(" ", "-");
  return <span className={`status-pill status-${tone}`}><span />{status}</span>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <span className="kicker">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function SectionHeader({ title, description, href, linkLabel = "View all" }: { title: string; description?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="section-heading">
      <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
      {href && <Link href={href}>{linkLabel}<ArrowRight size={15} /></Link>}
    </div>
  );
}

export function EmptyState({ title, copy, action, href }: { title: string; copy: string; action: string; href: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Sparkles /></span>
      <h2>{title}</h2>
      <p>{copy}</p>
      <Link className="button button-primary" href={href}>{action}</Link>
    </div>
  );
}

export function AttentionCard({ title, copy, href, action = "Fix this" }: { title: string; copy: string; href: string; action?: string }) {
  return (
    <Link className="attention-card" href={href}>
      <span className="attention-icon"><CircleAlert size={18} /></span>
      <span><strong>{title}</strong><small>{copy}</small></span>
      <span className="attention-action">{action}<ArrowRight size={14} /></span>
    </Link>
  );
}
