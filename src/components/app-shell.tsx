"use client";

import {
  BarChart3,
  CalendarDays,
  CircleUserRound,
  ContactRound,
  ImageIcon,
  LayoutDashboard,
  Link2,
  Megaphone,
  MenuSquare,
  Search,
  Settings,
  Ticket,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";

const navItems = [
  { label: "Today", href: "/admin", icon: LayoutDashboard },
  { label: "Events", href: "/admin/events", icon: CalendarDays },
  { label: "Tickets", href: "/admin/tickets", icon: Ticket },
  { label: "Guests", href: "/admin/guests", icon: UsersRound },
  { label: "Content", href: "/admin/content", icon: Megaphone },
  { label: "Media", href: "/admin/media", icon: ImageIcon },
  { label: "Customers", href: "/admin/customers", icon: ContactRound },
  { label: "Menu", href: "/admin/menu", icon: MenuSquare },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
];

export function AppShell({
  children,
  profile,
  preview,
}: {
  children: React.ReactNode;
  profile: { name: string; role: string };
  preview: boolean;
}) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);
  const searchItems = navItems.filter((item) =>
    item.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Logo />
        <nav className="side-nav" aria-label="Primary navigation">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active =
              href === "/admin" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                className={`nav-item ${active ? "active" : ""}`}
                href={href}
                key={href}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-lower">
          <Link
            className={`nav-item ${pathname.startsWith("/admin/settings") ? "active" : ""}`}
            href="/admin/settings"
          >
            <Settings size={19} strokeWidth={1.8} />
            <span>Settings</span>
          </Link>
          <Link className="public-link" href="/go" target="_blank">
            <Link2 size={16} /> View Oasis Links
          </Link>
          <div className="account-card">
            <span className="avatar">
              {profile.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <span>
              <strong>{profile.name}</strong>
              <small>{profile.role}</small>
            </span>
          </div>
        </div>
      </aside>

      <header className="mobile-header">
        <Logo />
        <Link
          className="icon-button"
          href="/admin/settings"
          aria-label="Open account settings"
        >
          <CircleUserRound />
        </Link>
      </header>

      <div className="workspace">
        <div className="utility-bar">
          <div className="location-switcher">
            <span className="location-dot" />
            Oasis workspace
          </div>
          <button
            className="search-button"
            type="button"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={17} />
            <span>Search the workspace…</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className={`preview-pill ${preview ? "" : "connected"}`}>
            <span /> {preview ? "Preview workspace" : "Connected workspace"}
          </div>
        </div>
        <main className="main-content">{children}</main>
      </div>

      {searchOpen && (
        <div
          className="modal-backdrop command-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSearchOpen(false);
          }}
        >
          <section
            className="command-palette panel"
            role="dialog"
            aria-modal="true"
            aria-label="Search Oasis"
          >
            <label>
              <Search />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Events, tickets, guests, content…"
                autoFocus
              />
              <button
                type="button"
                aria-label="Close search"
                onClick={() => setSearchOpen(false)}
              >
                <X />
              </button>
            </label>
            <div>
              {searchItems.map(({ label, href, icon: Icon }) => (
                <Link
                  href={href}
                  key={href}
                  onClick={() => setSearchOpen(false)}
                >
                  <Icon />
                  <span>
                    <strong>{label}</strong>
                    <small>Open {label.toLowerCase()}</small>
                  </span>
                </Link>
              ))}
              {!searchItems.length && (
                <p>No workspace section matches “{query}”.</p>
              )}
            </div>
          </section>
        </div>
      )}

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.slice(0, 5).map(({ label, href, icon: Icon }) => {
          const active =
            href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link href={href} key={href} className={active ? "active" : ""}>
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
