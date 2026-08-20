"use client";

import {
  Building2,
  Check,
  ChevronRight,
  CircleAlert,
  CreditCard,
  ExternalLink,
  FileClock,
  Globe2,
  KeyRound,
  Link2,
  LoaderCircle,
  Mail,
  MapPin,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import {
  LocationSettings,
  type SettingsLocation,
} from "@/components/settings/location-settings";
import {
  TeamSettings,
  type TeamMember,
} from "@/components/settings/team-settings";

type Integration = {
  name: string;
  key: string;
  description: string;
  connected: boolean;
};
type BusinessSettings = {
  name: string;
  phone: string;
  website: string;
  timezone: string;
};
const defaultBusinessSettings: BusinessSettings = {
  name: "Oasis Mexican Kitchen & Bar",
  phone: "",
  website: "",
  timezone: "America/Chicago",
};
const tabs = [
  { key: "business", label: "Business", icon: Building2 },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "users", label: "Users & access", icon: UsersRound },
  { key: "integrations", label: "Integrations", icon: Link2 },
  { key: "publishing", label: "Publishing defaults", icon: Settings2 },
  { key: "templates", label: "Event templates", icon: Sparkles },
];
const integrationIcons: Record<
  string,
  React.ComponentType<{ size?: number }>
> = {
  stripe: CreditCard,
  meta: Sparkles,
  google_business: Globe2,
  google_drive: Globe2,
  resend: Mail,
  openai: Sparkles,
};

export function SettingsHub({
  integrations,
  locations,
  team,
  initialBusiness = defaultBusinessSettings,
}: {
  integrations: Integration[];
  locations: SettingsLocation[];
  team: TeamMember[];
  initialBusiness?: BusinessSettings;
}) {
  const [active, setActive] = useState("business");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [business, setBusiness] = useState(initialBusiness);
  const [destinations, setDestinations] = useState([
    "Website",
    "Tickets",
    "Oasis Links",
    "Google Drive",
    "Instagram",
    "Facebook",
    "Google",
  ]);
  async function save(payload: object) {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setNotice(
        response.ok
          ? `Settings saved${data.mode === "preview" ? " in preview mode" : ""}.`
          : data.error,
      );
    } catch {
      setNotice("Settings couldn’t be saved.");
    } finally {
      setSaving(false);
    }
  }
  async function refreshHealth() {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Connection health is unavailable.");
      const configured = Object.values(data.services ?? {}).filter(
        (value) => value === "configured",
      ).length;
      setNotice(
        `Connection health refreshed · ${configured} services configured · ${data.mode} mode.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Connection health is unavailable.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="settings-layout">
      <aside className="settings-nav panel">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            className={active === key ? "active" : ""}
            onClick={() => setActive(key)}
            key={key}
          >
            <Icon />
            {label}
            <ChevronRight />
          </button>
        ))}
      </aside>
      <section className="settings-content">
        {notice && (
          <div className="upload-notice">
            <Check />
            {notice}
          </div>
        )}
        {active === "business" && (
          <div className="settings-section">
            <header>
              <span className="kicker">Business</span>
              <h2>The Oasis essentials</h2>
              <p>
                Shared details used across public pages, confirmations, and
                messages.
              </p>
            </header>
            <div className="panel settings-form">
              <label className="field">
                <span>Business name</span>
                <input
                  value={business.name}
                  onChange={(event) =>
                    setBusiness({ ...business, name: event.target.value })
                  }
                />
              </label>
              <div className="form-grid">
                <label className="field field-wide">
                  <span>Phone</span>
                  <input
                    value={business.phone}
                    onChange={(event) =>
                      setBusiness({ ...business, phone: event.target.value })
                    }
                  />
                </label>
                <label className="field field-wide">
                  <span>Website</span>
                  <input
                    value={business.website}
                    onChange={(event) =>
                      setBusiness({ ...business, website: event.target.value })
                    }
                    placeholder="https://"
                  />
                </label>
              </div>
              <label className="field">
                <span>Default timezone</span>
                <select
                  value={business.timezone}
                  onChange={(event) =>
                    setBusiness({ ...business, timezone: event.target.value })
                  }
                >
                  <option>America/Chicago</option>
                </select>
              </label>
              <button
                className="button button-primary"
                onClick={() => save({ section: "business", ...business })}
                disabled={saving}
              >
                {saving ? <LoaderCircle className="spin" /> : <Save />}Save
                business details
              </button>
            </div>
          </div>
        )}
        {active === "locations" && (
          <LocationSettings initialLocations={locations} />
        )}
        {active === "users" && (
          <div className="settings-section">
            <header>
              <span className="kicker">Users & access</span>
              <h2>Give everyone the right view</h2>
              <p>
                Permissions are enforced on the server and in the database—not
                just hidden in the interface.
              </p>
            </header>
            <div className="role-explainer">
              {[
                {
                  role: "Owner / Admin",
                  copy: "Everything, including integrations and access.",
                  icon: ShieldCheck,
                },
                {
                  role: "Manager",
                  copy: "Customers, refunds, analytics, campaigns, and menu.",
                  icon: UserRoundCog,
                },
                {
                  role: "Staff",
                  copy: "Events, content, media, publishing, and basic sales.",
                  icon: Sparkles,
                },
                {
                  role: "Door",
                  copy: "Scanner and active-event roster only.",
                  icon: KeyRound,
                },
              ].map(({ role, copy, icon: Icon }) => (
                <div key={role}>
                  <span>
                    <Icon />
                  </span>
                  <strong>{role}</strong>
                  <small>{copy}</small>
                </div>
              ))}
            </div>
            <TeamSettings initialTeam={team} />
          </div>
        )}
        {active === "integrations" && (
          <div className="settings-section">
            <header>
              <span className="kicker">Integrations</span>
              <h2>Connection readiness</h2>
              <p>
                Credentials stay server-side. Configured means the required
                settings are present; live provider activity still needs a
                test.
              </p>
            </header>
            <div className="integration-grid">
              {integrations.map(({ name, key, description, connected }) => {
                const Icon = integrationIcons[key] ?? Link2;
                return (
                  <article className="panel" key={name}>
                    <span className="integration-icon">
                      <Icon size={20} />
                    </span>
                    <div>
                      <strong>{name}</strong>
                      <small>{description}</small>
                    </div>
                    <span
                      className={`integration-state ${connected ? "connected" : "attention"}`}
                    >
                      {connected ? (
                        <>
                          <Check />
                          Configured
                        </>
                      ) : (
                        <>
                          <CircleAlert />
                          Not connected
                        </>
                      )}
                    </span>
                    <button
                      className="button button-secondary"
                      onClick={() =>
                        setNotice(
                          connected
                            ? `${name} configuration is present. Verify it with a provider test account before relying on live activity.`
                            : `${name} needs server-side credentials in the deployment environment before it can be tested.`,
                        )
                      }
                    >
                      Setup details
                      <ExternalLink />
                    </button>
                  </article>
                );
              })}
            </div>
            <details className="technical-details panel">
              <summary>
                <span>
                  <FileClock />
                  Admin troubleshooting
                </span>
                <ChevronRight />
              </summary>
              <div>
                <p>Technical details are visible only to Owner / Admin.</p>
                <dl>
                  <div>
                    <dt>Last publishing run</dt>
                    <dd>No live provider run verified on this screen</dd>
                  </div>
                  <div>
                    <dt>Stripe webhook</dt>
                    <dd>
                      {integrations.find((item) => item.key === "stripe")
                        ?.connected
                        ? "Ready"
                        : "Waiting for secret"}
                    </dd>
                  </div>
                  <div>
                    <dt>Workflow runtime</dt>
                    <dd>Included in the build · verify after deployment</dd>
                  </div>
                </dl>
                <button
                  className="button button-secondary"
                  onClick={refreshHealth}
                  disabled={saving}
                >
                  <RotateCcw />
                  Refresh connection health
                </button>
              </div>
            </details>
          </div>
        )}
        {active === "publishing" && (
          <div className="settings-section">
            <header>
              <span className="kicker">Publishing defaults</span>
              <h2>One press, the usual places</h2>
              <p>Choose which destinations start enabled for new events.</p>
            </header>
            <div className="panel publishing-defaults">
              {[
                "Website",
                "Tickets",
                "Oasis Links",
                "Google Drive",
                "Instagram",
                "Facebook",
                "Google",
              ].map((name) => {
                const enabled = destinations.includes(name);
                return (
                  <button
                    className={enabled ? "enabled" : ""}
                    onClick={() =>
                      setDestinations(
                        enabled
                          ? destinations.filter((item) => item !== name)
                          : [...destinations, name],
                      )
                    }
                    key={name}
                  >
                    <Globe2 />
                    <span>
                      <strong>{name}</strong>
                      <small>
                        {enabled ? "Enabled by default" : "Off by default"}
                      </small>
                    </span>
                    <i>
                      <span />
                    </i>
                  </button>
                );
              })}
              <label className="field">
                <span>Low inventory badge threshold</span>
                <input type="number" defaultValue="8" />
              </label>
              <button
                className="button button-primary"
                onClick={() =>
                  save({
                    section: "publishing",
                    defaultDestinations: destinations
                      .map((name) =>
                        name
                          .toLowerCase()
                          .replaceAll(" ", "_")
                          .replace("google", "google_business"),
                      )
                      .map((name) =>
                        name === "google_business_drive"
                          ? "google_drive"
                          : name,
                      ),
                    lowInventoryThreshold: 8,
                  })
                }
              >
                <Save />
                Save defaults
              </button>
            </div>
          </div>
        )}
        {active === "templates" && (
          <div className="settings-section">
            <header>
              <span className="kicker">Event templates</span>
              <h2>Your best nights, ready to repeat</h2>
              <p>
                Templates carry sensible timing, ticket, capacity, campaign, and
                publishing defaults.
              </p>
            </header>
            <div className="template-settings-grid">
              {[
                "DJ Night",
                "Banda Saturday",
                "Brunch",
                "Paint & Sip",
                "Watch Party",
                "Free RSVP",
                "Special Guest",
              ].map((name, index) => (
                <article className="panel" key={name}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{name}</strong>
                    <small>
                      {index % 2 === 0
                        ? "Weekend campaign · Tickets"
                        : "Standard campaign · RSVP"}
                    </small>
                  </div>
                  <em className="template-state">
                    <Check />
                    Built in
                  </em>
                </article>
              ))}
            </div>
            <p className="settings-help">
              Choose a built-in template when creating an event, then adjust its
              timing, tickets, campaign, and destinations for that night.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
