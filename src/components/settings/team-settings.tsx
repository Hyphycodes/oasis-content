"use client";

import { Check, LoaderCircle, Plus, Send, X } from "lucide-react";
import { useState } from "react";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "manager" | "staff" | "door";
  status: string;
};
const roleLabels = {
  owner: "Owner / Admin",
  manager: "Manager",
  staff: "Staff",
  door: "Door",
};

export function TeamSettings({ initialTeam }: { initialTeam: TeamMember[] }) {
  const [team, setTeam] = useState(initialTeam);
  const [open, setOpen] = useState(false);
  const [invite, setInvite] = useState({
    name: "",
    email: "",
    role: "staff" as TeamMember["role"],
  });
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  async function request(payload: object) {
    const response = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error ?? "Team access could not be updated.");
    return data;
  }

  async function changeRole(member: TeamMember, role: TeamMember["role"]) {
    setBusy(member.id);
    setNotice("");
    try {
      const data = await request({ action: "role", userId: member.id, role });
      setTeam((current) =>
        current.map((item) =>
          item.id === member.id ? { ...item, role } : item,
        ),
      );
      setNotice(
        `${member.name} is now ${roleLabels[role]}${data.mode === "preview" ? " in preview mode" : ""}.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Team access could not be updated.",
      );
    } finally {
      setBusy("");
    }
  }

  async function inviteMember(event: React.FormEvent) {
    event.preventDefault();
    setBusy("invite");
    setNotice("");
    try {
      const data = await request({ action: "invite", ...invite });
      setTeam((current) => [...current, data.member]);
      setOpen(false);
      setInvite({ name: "", email: "", role: "staff" });
      setNotice(
        `Invitation sent to ${data.member.email}${data.mode === "preview" ? " in preview mode" : ""}.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The invitation could not be sent.",
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="team-management">
      {notice ? (
        <div className="upload-notice" role="status">
          <Check />
          {notice}
        </div>
      ) : null}
      <div className="team-list panel">
        <header>
          <span>Team member</span>
          <span>Role</span>
          <span>Status</span>
          <span />
        </header>
        {team.map((user) => (
          <div key={user.id}>
            <span>
              <i>
                {user.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </i>
              <span>
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </span>
            </span>
            <select
              value={user.role}
              onChange={(event) =>
                changeRole(user, event.target.value as TeamMember["role"])
              }
              disabled={busy === user.id}
            >
              <option value="owner">Owner / Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
              <option value="door">Door</option>
            </select>
            <span
              className={`integration-state ${user.status === "Active" ? "connected" : "attention"}`}
            >
              {busy === user.id ? <LoaderCircle className="spin" /> : <Check />}
              {busy === user.id ? "Saving" : user.status}
            </span>
            <span />
          </div>
        ))}
      </div>
      <button className="button button-primary" onClick={() => setOpen(true)}>
        <Plus />
        Invite team member
      </button>
      {open ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <form
            className="location-modal panel"
            onSubmit={inviteMember}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-title"
          >
            <header>
              <div>
                <span className="kicker">Owner / Admin</span>
                <h2 id="invite-title">Invite the team</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setOpen(false)}
                aria-label="Close invitation"
              >
                <X />
              </button>
            </header>
            <label className="field">
              <span>Name</span>
              <input
                required
                value={invite.name}
                onChange={(event) =>
                  setInvite({ ...invite, name: event.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                required
                value={invite.email}
                onChange={(event) =>
                  setInvite({ ...invite, email: event.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Role</span>
              <select
                value={invite.role}
                onChange={(event) =>
                  setInvite({
                    ...invite,
                    role: event.target.value as TeamMember["role"],
                  })
                }
              >
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <footer>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                className="button button-primary"
                disabled={busy === "invite"}
              >
                {busy === "invite" ? (
                  <LoaderCircle className="spin" />
                ) : (
                  <Send />
                )}
                Send invitation
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}
