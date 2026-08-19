import Link from "next/link";

export function Logo({
  compact = false,
  href = "/admin",
}: {
  compact?: boolean;
  href?: string;
}) {
  return (
    <Link
      className={`brand ${compact ? "brand-compact" : ""}`}
      href={href}
      aria-label={href === "/" ? "Oasis home" : "Oasis Today"}
    >
      <span className="brand-mark" aria-hidden="true">
        <span />
      </span>
      {!compact && (
        <span className="brand-wordmark">
          <strong>Oasis</strong>
          <small>Kitchen · Bar · Cultura</small>
        </span>
      )}
    </Link>
  );
}
