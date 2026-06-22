"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import ProgressBar from "@/components/ProgressBar";
import Stat from "@/components/Stat";
import { Panel } from "@/components/Panel";
import { pct, todayLong } from "@/lib/utils";

type MemberStats = {
  id: number;
  name: string;
  role: string;
  slug: string;
  status: "active" | "paused";
  created_at: string;
  total_tasks: number;
  done_tasks: number;
  question_count: number;
  answered_today: number;
  has_checked_in_today: number;
};

export default function ManagerPage() {
  const [members, setMembers] = useState<MemberStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/members", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setMembers(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const totals = useMemo(() => {
    const totalTasks = members.reduce((a, m) => a + Number(m.total_tasks), 0);
    const doneTasks = members.reduce((a, m) => a + Number(m.done_tasks), 0);
    const checkedIn = members.filter(
      (m) =>
        Number(m.has_checked_in_today) > 0 &&
        Number(m.answered_today) >= Number(m.question_count) &&
        Number(m.question_count) > 0
    ).length;
    return {
      members: members.length,
      totalTasks,
      doneTasks,
      checkedIn,
      checkedInPct: pct(checkedIn, members.length),
      tasksPct: pct(doneTasks, totalTasks),
    };
  }, [members]);

  function copyLink(slug: string, id: number) {
    const url = `${origin}/u/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="border-b border-bbx-line bg-bbx-bg/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden md:inline text-[10px] tracking-[0.22em] uppercase text-bbx-dim">
              / team
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdd(true)} className="bbx-btn">
              + NEW MEMBER
            </button>
            <button onClick={logout} className="bbx-btn-ghost">
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8">
        {/* Title */}
        <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="bbx-label">
              <span className="text-bbx-accent">▸</span>{" "}
              {todayLong().toUpperCase()}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-bbx-text mt-2">
              TEAM PROGRESS
              <span className="text-bbx-accent">.</span>
            </h1>
            <p className="text-xs text-bbx-subtext mt-1.5">
              Live snapshot of today&apos;s check-ins and overall task completion.
            </p>
          </div>
          <div className="text-[10px] text-bbx-dim tracking-[0.18em] uppercase">
            <span className="bbx-dot bg-bbx-accent inline-block mr-2 animate-pulse-dot" />
            live · auto-refresh on action
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-bbx-line">
          {/* using zero gap + border lets the cells share hairlines like the screenshot */}
          <div className="border-b md:border-b-0 md:border-r border-bbx-line">
            <Stat
              label="TEAM"
              value={totals.members}
              tone="muted"
            />
          </div>
          <div className="border-b md:border-b-0 md:border-r border-bbx-line">
            <Stat
              label="CHECKED-IN TODAY"
              value={`${totals.checkedIn}/${totals.members}`}
              delta={`${totals.checkedInPct}%`}
            />
          </div>
          <div className="border-r border-bbx-line">
            <Stat
              label="TASKS COMPLETED"
              value={`${totals.doneTasks}/${totals.totalTasks}`}
            />
          </div>
          <div>
            <Stat
              label="OVERALL"
              value={`${totals.tasksPct}%`}
              tone={totals.tasksPct >= 80 ? "good" : totals.tasksPct >= 40 ? "accent" : "warn"}
            />
          </div>
        </div>

        {/* Team list */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="bbx-label">
              <span className="text-bbx-accent">▸</span> MEMBERS
            </h2>
            <span className="text-[10px] tracking-[0.18em] uppercase text-bbx-dim">
              {members.length} total
            </span>
          </div>

          {loading ? (
            <div className="bbx-panel p-10 text-center text-sm text-bbx-dim">
              Loading…<span className="animate-caret">▌</span>
            </div>
          ) : members.length === 0 ? (
            <div className="bbx-panel p-10 text-center">
              <p className="text-sm text-bbx-subtext">
                No members yet. Click{" "}
                <span className="text-bbx-accent">+ NEW MEMBER</span> to get
                started.
              </p>
            </div>
          ) : (
            <div className="border border-bbx-line divide-y divide-bbx-line bbx-panel">
              {members.map((m) => (
                <MemberRow
                  key={m.id}
                  m={m}
                  origin={origin}
                  copied={copiedId === m.id}
                  onCopy={() => copyLink(m.slug, m.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {showAdd && (
        <AddMemberModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            fetchMembers();
          }}
        />
      )}
    </div>
  );
}

function MemberRow({
  m,
  origin,
  copied,
  onCopy,
}: {
  m: MemberStats;
  origin: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const todayPct = pct(Number(m.answered_today), Number(m.question_count));
  const tasksPct = pct(Number(m.done_tasks), Number(m.total_tasks));
  const initial = m.name.charAt(0).toUpperCase();
  const checkedIn = Number(m.has_checked_in_today) > 0;
  const isPaused = m.status === "paused";

  return (
    <div className="p-4 md:p-5 hover:bg-bbx-panel2/40 transition-colors group">
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* avatar + name */}
        <div className="col-span-12 md:col-span-4 flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 bg-bbx-panel2 border border-bbx-line text-bbx-accent grid place-items-center font-bold text-base shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <Link
              href={`/manager/members/${m.id}`}
              className="text-sm font-semibold text-bbx-text hover:text-bbx-accent truncate block tracking-wide"
            >
              {m.name.toUpperCase()}
            </Link>
            <p className="text-[10px] text-bbx-dim tracking-[0.14em] uppercase truncate mt-0.5">
              {m.role}
            </p>
          </div>
        </div>

        {/* status */}
        <div className="col-span-6 md:col-span-2">
          {isPaused ? (
            <StatusPill label="PAUSED" tone="warn" />
          ) : checkedIn ? (
            <StatusPill label="CHECKED IN" tone="good" />
          ) : (
            <StatusPill label="PENDING" tone="accent" pulse />
          )}
        </div>

        {/* progress bars */}
        <div className="col-span-6 md:col-span-4 space-y-2">
          <ProgressBar
            percent={todayPct}
            label={`TODAY ${m.answered_today}/${m.question_count}`}
            size="sm"
          />
          <ProgressBar
            percent={tasksPct}
            label={`TASKS ${m.done_tasks}/${m.total_tasks}`}
            size="sm"
          />
        </div>

        {/* actions */}
        <div className="col-span-12 md:col-span-2 flex gap-2 md:justify-end items-center">
          <Link href={`/manager/members/${m.id}`} className="bbx-btn-ghost">
            OPEN
          </Link>
          <button onClick={onCopy} className="bbx-btn-ghost">
            {copied ? "COPIED ✓" : "LINK"}
          </button>
        </div>
      </div>

      {/* link strip */}
      <div className="mt-3 pl-13 flex items-center gap-2 text-[10px] text-bbx-dim">
        <span className="text-bbx-accent">↳</span>
        <a
          href={`${origin}/u/${m.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono hover:text-bbx-accent truncate"
        >
          {origin}/u/{m.slug}
        </a>
      </div>
    </div>
  );
}

function StatusPill({
  label,
  tone,
  pulse,
}: {
  label: string;
  tone: "good" | "warn" | "accent" | "muted";
  pulse?: boolean;
}) {
  const dotColor =
    tone === "good"
      ? "bg-bbx-good"
      : tone === "warn"
      ? "bg-bbx-warn"
      : tone === "accent"
      ? "bg-bbx-accent"
      : "bg-bbx-dim";
  const textColor =
    tone === "good"
      ? "text-bbx-good"
      : tone === "warn"
      ? "text-bbx-warn"
      : tone === "accent"
      ? "text-bbx-accent"
      : "text-bbx-dim";
  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 border border-bbx-line bg-bbx-panel2">
      <span
        className={`bbx-dot ${dotColor} ${pulse ? "animate-pulse-dot" : ""}`}
      />
      <span className={`text-[10px] tracking-[0.18em] font-semibold ${textColor}`}>
        {label}
      </span>
    </div>
  );
}

function AddMemberModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSubmitting(true);
    await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role }),
    });
    onCreated();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bbx-panel w-full max-w-md animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bbx-panel-header">
          <div className="flex items-center gap-2">
            <span className="text-bbx-accent">▸</span>
            <span>create / member</span>
          </div>
          <button onClick={onClose} className="text-bbx-dim hover:text-bbx-text">
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="NAME" value={name} onChange={setName} autoFocus />
          <Field
            label="ROLE"
            value={role}
            onChange={setRole}
            placeholder="design / sales / ops"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="bbx-btn-ghost">
              CANCEL
            </button>
            <button
              onClick={save}
              disabled={submitting || !name.trim()}
              className="bbx-btn"
            >
              {submitting ? "CREATING…" : "CREATE ▶"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="bbx-label block mb-1.5 flex items-center gap-1.5">
        <span className="text-bbx-accent">▸</span>
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="bbx-input"
      />
    </div>
  );
}
