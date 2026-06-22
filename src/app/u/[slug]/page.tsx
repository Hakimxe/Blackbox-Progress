"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Logo from "@/components/Logo";
import ProgressRing from "@/components/ProgressRing";
import { Panel } from "@/components/Panel";
import {
  calcStreak,
  daysAgo,
  pct,
  prettyDate,
  relDay,
  relTime,
  todayLong,
  ymd,
} from "@/lib/utils";

type Member = {
  id: number;
  name: string;
  role: string;
  slug: string;
  status: "active" | "paused";
  priority?: string;
};
type Task = {
  id: number;
  member_id: number;
  title: string;
  status: "todo" | "doing" | "done";
  created_at?: string;
};
type Question = {
  id: number;
  label: string;
  type: "number" | "text" | "yes_no";
  active: number;
};
type Checkin = {
  id: number;
  date: string;
  locked: number;
  updated_at?: string;
};
type Answer = {
  id: number;
  checkin_id: number;
  question_id: number;
  value: string | null;
};
type Bundle = {
  member: Member;
  tasks: Task[];
  questions: Question[];
  checkins: Checkin[];
  answers: Answer[];
};

export default function PublicMemberPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [data, setData] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  // `editMode` lets a member re-open today's already-submitted check-in
  // to fix or add to their answers. They can update as many times as they want.
  const [editMode, setEditMode] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const today = ymd();
  const draftKey = slug ? `pbbx-draft-${slug}-${today}` : "";

  // `silent=true` means a background refresh — no full-page loading spinner,
  // no draft reset, no scroll jump. Used after task toggles and check-in submit.
  const fetchData = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!slug) return;
      if (!opts.silent) setLoading(true);
      const res = await fetch(`/api/public/${slug}`, { cache: "no-store" });
      if (res.ok) {
        const b: Bundle = await res.json();
        setData(b);
        if (!opts.silent) {
          const todayCheckin = b.checkins.find((c) => c.date === today);
          const initialDraft: Record<number, string> = {};
          for (const q of b.questions) {
            const a = todayCheckin
              ? b.answers.find(
                  (x) =>
                    x.checkin_id === todayCheckin.id && x.question_id === q.id
                )
              : null;
            initialDraft[q.id] = a?.value ?? "";
          }
          if (
            !todayCheckin?.locked &&
            typeof window !== "undefined" &&
            draftKey
          ) {
            try {
              const saved = localStorage.getItem(draftKey);
              if (saved) {
                const parsed = JSON.parse(saved) as Record<string, string>;
                for (const [qid, v] of Object.entries(parsed)) {
                  const n = Number(qid);
                  if (b.questions.some((q) => q.id === n) && !initialDraft[n]) {
                    initialDraft[n] = v;
                  }
                }
              }
            } catch {
              // ignore
            }
          }
          setDraft(initialDraft);
        }
      } else if (res.status === 404) {
        setData(null);
      }
      if (!opts.silent) setLoading(false);
    },
    [slug, today, draftKey]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const todayCheckin = data?.checkins.find((c) => c.date === today);
  const isLocked = !!todayCheckin?.locked;
  const activeQuestions = useMemo(
    () => (data ? data.questions.filter((q) => q.active === 1) : []),
    [data]
  );
  const answeredCount = useMemo(
    () =>
      activeQuestions.filter((q) => (draft[q.id] ?? "").trim() !== "").length,
    [activeQuestions, draft]
  );
  const todayPct = pct(answeredCount, activeQuestions.length);

  useEffect(() => {
    if (isLocked || !draftKey || typeof window === "undefined") return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [draft, draftKey, isLocked]);

  const streak = useMemo(() => {
    if (!data) return 0;
    return calcStreak(data.checkins.map((c) => c.date));
  }, [data]);

  const yesterdayCheckin = useMemo(() => {
    if (!data) return null;
    const sorted = [...data.checkins]
      .filter((c) => c.date !== today)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    return sorted[0] ?? null;
  }, [data, today]);

  async function submitCheckin() {
    if (!data || !slug) return;
    setSubmitting(true);
    setErr(null);
    const payload = {
      slug,
      date: today,
      answers: activeQuestions.map((q) => ({
        question_id: q.id,
        value: draft[q.id] ?? "",
      })),
    };
    const res = await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    setConfirmStep(false);
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      setErr(e.error || "Failed to submit.");
      return;
    }
    if (typeof window !== "undefined" && draftKey) {
      localStorage.removeItem(draftKey);
    }
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 2500);
    setEditMode(false);
    // Silent re-fetch so the page just updates state in place, no scroll jump.
    fetchData({ silent: true });
  }

  async function toggleTask(t: Task) {
    if (!slug || !data) return;
    const next: Task["status"] = t.status === "done" ? "todo" : "done";

    // 1. Optimistic update — mutate local state instantly. No re-render of
    //    the whole page, no scroll jump.
    const prevTasks = data.tasks;
    setData({
      ...data,
      tasks: data.tasks.map((x) =>
        x.id === t.id ? { ...x, status: next } : x
      ),
    });

    // 2. Fire the PATCH in the background.
    try {
      const res = await fetch(`/api/public/${slug}/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("rollback");
      // No re-fetch needed — local state already matches what the server has.
    } catch {
      // Roll back on failure.
      setData((cur) => (cur ? { ...cur, tasks: prevTasks } : cur));
    }
  }

  async function addTask(title: string) {
    if (!slug || !data) return;
    const clean = title.trim();
    if (!clean) return;
    try {
      const res = await fetch(`/api/public/${slug}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: clean }),
      });
      if (!res.ok) throw new Error("failed");
      const created: Task = await res.json();
      setData((cur) =>
        cur ? { ...cur, tasks: [...cur.tasks, created] } : cur
      );
    } catch {
      // ignore — user can retry
    }
  }

  async function editTask(t: Task, title: string) {
    if (!slug || !data) return;
    const clean = title.trim();
    if (!clean || clean === t.title) return;
    const prevTasks = data.tasks;
    setData({
      ...data,
      tasks: data.tasks.map((x) =>
        x.id === t.id ? { ...x, title: clean } : x
      ),
    });
    try {
      const res = await fetch(`/api/public/${slug}/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: clean }),
      });
      if (!res.ok) throw new Error("rollback");
    } catch {
      setData((cur) => (cur ? { ...cur, tasks: prevTasks } : cur));
    }
  }

  async function deleteTask(t: Task) {
    if (!slug || !data) return;
    if (!confirm(`Delete task "${t.title}"?`)) return;
    const prevTasks = data.tasks;
    setData({
      ...data,
      tasks: data.tasks.filter((x) => x.id !== t.id),
    });
    try {
      const res = await fetch(`/api/public/${slug}/tasks/${t.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("rollback");
    } catch {
      setData((cur) => (cur ? { ...cur, tasks: prevTasks } : cur));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-bbx-dim">
        Loading…<span className="animate-caret">▌</span>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="text-center">
          <p className="text-5xl text-bbx-accent">404</p>
          <h1 className="text-xl font-semibold mt-4 tracking-wide">
            PAGE NOT FOUND
          </h1>
          <p className="text-sm text-bbx-dim mt-2 tracking-wide">
            Ask your manager for the correct link.
          </p>
        </div>
      </div>
    );
  }

  const { member, tasks } = data;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const tasksPct = pct(doneTasks, tasks.length);
  const allTasksDone = tasks.length > 0 && doneTasks === tasks.length;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="border-b border-bbx-line bg-bbx-bg/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden md:inline text-[10px] tracking-[0.22em] uppercase text-bbx-dim">
              / personal
            </span>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 border border-bbx-accent/40 bg-bbx-accent/10 text-bbx-accent">
              <span className="bbx-dot bg-bbx-accent animate-pulse-dot" />
              <span className="text-[10px] tracking-[0.18em] font-semibold tabular-nums">
                {streak}D STREAK
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8 pb-32 space-y-6">
        {/* HERO */}
        <div className="bbx-panel">
          <div className="bbx-panel-header">
            <div className="flex items-center gap-2">
              <span className="text-bbx-accent">▸</span>
              <span>{todayLong().toUpperCase()}</span>
            </div>
            <span className="text-bbx-dim">/u/{member.slug}</span>
          </div>
          <div className="p-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] text-bbx-dim tracking-[0.18em] uppercase">
                Hello,
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-bbx-text mt-1">
                {member.name.toUpperCase()}
                <span className="text-bbx-accent">.</span>
              </h1>
              <p className="text-[11px] text-bbx-dim tracking-[0.14em] uppercase mt-2">
                {member.role}
              </p>
            </div>
            <ProgressRing percent={todayPct} size={92} stroke={6}>
              <div className="text-center leading-none">
                <div className="text-xl bbx-num text-bbx-text">{todayPct}%</div>
                <div className="text-[9px] tracking-[0.18em] text-bbx-dim mt-1">
                  TODAY
                </div>
              </div>
            </ProgressRing>
          </div>
        </div>

        {/* PRIORITY — your north star */}
        {member.priority && (
          <div className="border border-bbx-accent/40 bg-bbx-accent/5 p-5">
            <p className="text-[10px] text-bbx-accent tracking-[0.18em] font-semibold flex items-center gap-1.5">
              <span>▸</span> YOUR PRIORITY
            </p>
            <p className="text-sm text-bbx-text mt-2.5 leading-relaxed">
              {member.priority}
            </p>
          </div>
        )}

        {/* STATUS BANNER */}
        {isLocked ? (
          <div className="bbx-panel relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-bbx-good/10 to-transparent animate-scan" />
            </div>
            <div className="p-5 flex items-center gap-4 relative flex-wrap">
              <div className="h-10 w-10 border border-bbx-good text-bbx-good grid place-items-center text-base">
                ✓
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-bbx-good font-semibold tracking-[0.14em] text-sm">
                  SUBMITTED{editMode ? " · EDITING" : ""}
                </p>
                <p className="text-[11px] text-bbx-dim mt-1 tracking-wide">
                  {editMode
                    ? "Make your changes below and tap UPDATE to save."
                    : todayCheckin?.updated_at
                    ? `Updated ${relTime(todayCheckin.updated_at)} · you can still edit anytime today.`
                    : "You can still edit anytime today."}
                </p>
              </div>
              {justSubmitted && (
                <span className="text-bbx-good text-xs tracking-[0.18em] animate-pop">
                  ✓ DONE
                </span>
              )}
              {!editMode && !justSubmitted && (
                <button
                  onClick={() => {
                    // Seed the draft with the current answers so the user
                    // sees what they wrote and only changes what they want.
                    if (!data || !todayCheckin) return;
                    const d: Record<number, string> = {};
                    for (const q of activeQuestions) {
                      const a = data.answers.find(
                        (x) =>
                          x.checkin_id === todayCheckin.id &&
                          x.question_id === q.id
                      );
                      d[q.id] = a?.value ?? "";
                    }
                    setDraft(d);
                    setEditMode(true);
                    setConfirmStep(false);
                  }}
                  className="bbx-btn-ghost"
                >
                  EDIT MY ANSWERS
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bbx-panel">
            <div className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 border border-bbx-accent text-bbx-accent grid place-items-center">
                <span className="bbx-dot bg-bbx-accent animate-pulse-dot" />
              </div>
              <div className="flex-1">
                <p className="text-bbx-text font-semibold tracking-[0.14em] text-sm">
                  ▸ DAILY CHECK-IN PENDING
                </p>
                <p className="text-[11px] text-bbx-dim mt-1 tracking-wide">
                  {activeQuestions.length - answeredCount > 0
                    ? `${
                        activeQuestions.length - answeredCount
                      } question${
                        activeQuestions.length - answeredCount > 1 ? "s" : ""
                      } left · ~30s to fill`
                    : "All filled — review & submit below."}
                </p>
              </div>
              <div className="text-[10px] text-bbx-dim tracking-[0.18em] tabular-nums">
                {answeredCount}/{activeQuestions.length}
              </div>
            </div>
          </div>
        )}

        {/* YESTERDAY RECAP */}
        {yesterdayCheckin && (
          <YesterdayRecap
            checkin={yesterdayCheckin}
            answers={data.answers}
            questions={activeQuestions}
          />
        )}

        {/* CHECK-IN FORM */}
        <Panel title={`CHECK-IN // ${activeQuestions.length} Q`}>
          {activeQuestions.length === 0 ? (
            <div className="p-5 text-sm text-bbx-dim">
              No check-in questions yet. Ask your manager to set them up.
            </div>
          ) : (
            <div>
              {activeQuestions.map((q, idx) => (
                <QuestionRow
                  key={q.id}
                  q={q}
                  idx={idx}
                  value={draft[q.id] ?? ""}
                  onChange={(v) => setDraft({ ...draft, [q.id]: v })}
                  disabled={isLocked && !editMode}
                />
              ))}

              {err && (
                <div className="px-4 py-3 border-t border-bbx-line text-xs text-bbx-bad bg-bbx-bad/10">
                  ! {err}
                </div>
              )}

              {(!isLocked || editMode) && (
                <div className="p-4 border-t border-bbx-line bg-bbx-panel2/40">
                  {!confirmStep ? (
                    <div className="flex gap-2">
                      {editMode && (
                        <button
                          onClick={() => {
                            // Cancel edit — restore draft from saved answers
                            // and exit edit mode without saving.
                            if (data && todayCheckin) {
                              const d: Record<number, string> = {};
                              for (const q of activeQuestions) {
                                const a = data.answers.find(
                                  (x) =>
                                    x.checkin_id === todayCheckin.id &&
                                    x.question_id === q.id
                                );
                                d[q.id] = a?.value ?? "";
                              }
                              setDraft(d);
                            }
                            setEditMode(false);
                          }}
                          className="bbx-btn-ghost"
                        >
                          ◀ CANCEL
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmStep(true)}
                        disabled={answeredCount === 0}
                        className="bbx-btn flex-1"
                      >
                        {editMode
                          ? `REVIEW & UPDATE (${answeredCount}/${activeQuestions.length}) ▶`
                          : answeredCount < activeQuestions.length
                          ? `REVIEW & SUBMIT (${answeredCount}/${activeQuestions.length}) ▶`
                          : "REVIEW & SUBMIT ▶"}
                      </button>
                    </div>
                  ) : (
                    <div className="border border-bbx-accent/40 bg-bbx-accent/5 p-4 animate-slide-up">
                      <p className="text-bbx-text text-sm font-semibold tracking-[0.14em]">
                        ▸ {editMode ? "CONFIRM UPDATE" : "CONFIRM SUBMISSION"}
                      </p>
                      <p className="text-[11px] text-bbx-subtext mt-1.5 tracking-wide">
                        {editMode
                          ? "Your new answers will replace today's. You can edit again later if needed."
                          : "You're submitting today's check-in. You can still edit anytime today if something changes."}
                      </p>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => setConfirmStep(false)}
                          className="bbx-btn-ghost flex-1"
                        >
                          ◀ BACK
                        </button>
                        <button
                          onClick={submitCheckin}
                          disabled={submitting}
                          className="bbx-btn flex-1"
                        >
                          {submitting
                            ? "SAVING…"
                            : editMode
                            ? "UPDATE ▶"
                            : "CONFIRM ▶"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Panel>

        {/* TASKS */}
        <Panel
          title={`TASKS // ${doneTasks}/${tasks.length}`}
          subtitle="tick as you go · add / edit your own"
        >
          <div>
            {tasks.length === 0 && (
              <p className="text-sm text-bbx-dim p-5">
                No tasks yet. Add one below.
              </p>
            )}
            {tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onToggle={() => toggleTask(t)}
                onSave={(title) => editTask(t, title)}
                onDelete={() => deleteTask(t)}
              />
            ))}
          </div>

          <AddTaskRow onAdd={addTask} />

          {allTasksDone && tasks.length > 0 && (
            <div className="p-4 border-t border-bbx-line bg-bbx-good/10 text-center">
              <p className="text-bbx-good text-sm font-semibold tracking-[0.14em]">
                ✓ ALL TASKS COMPLETE
              </p>
            </div>
          )}
        </Panel>

        {/* HISTORY */}
        {data.checkins.length > 1 && (
          <Panel title="LAST 7 DAYS">
            <div className="p-4 grid grid-cols-7 gap-1.5">
              {[...data.checkins]
                .slice(0, 7)
                .reverse()
                .map((c) => {
                  const answeredForDay = data.answers.filter(
                    (a) =>
                      a.checkin_id === c.id &&
                      a.value !== null &&
                      a.value.trim() !== "" &&
                      activeQuestions.some((q) => q.id === a.question_id)
                  ).length;
                  const p = pct(answeredForDay, activeQuestions.length);
                  const tone =
                    p >= 80
                      ? "bg-bbx-good text-bbx-bg"
                      : p >= 40
                      ? "bg-bbx-accent text-bbx-bg"
                      : p > 0
                      ? "bg-bbx-warn text-bbx-bg"
                      : "bg-bbx-panel2 text-bbx-dim border border-bbx-line";
                  return (
                    <div
                      key={c.id}
                      className="text-center"
                      title={`${prettyDate(c.date)} — ${p}%`}
                    >
                      <div
                        className={`h-10 grid place-items-center text-[10px] font-bold tabular-nums ${tone}`}
                      >
                        {p}
                      </div>
                      <p className="text-[9px] text-bbx-dim mt-1 tracking-[0.1em] uppercase truncate">
                        {prettyDate(c.date).split(" ")[0]}
                      </p>
                    </div>
                  );
                })}
            </div>
          </Panel>
        )}
      </main>
    </div>
  );
}

function QuestionRow({
  q,
  idx,
  value,
  onChange,
  disabled,
}: {
  q: Question;
  idx: number;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const answered = value.trim() !== "";

  return (
    <div className="border-b border-bbx-line last:border-0">
      <div className="grid grid-cols-[auto_1fr]">
        <div
          className={`px-4 py-4 border-r border-bbx-line min-w-[80px] ${
            answered ? "bg-bbx-good/5" : "bg-bbx-panel2/30"
          }`}
        >
          <p className="text-[10px] text-bbx-dim tracking-[0.18em] uppercase">
            Q{String(idx + 1).padStart(2, "0")}
          </p>
          {answered ? (
            <span className="inline-block mt-1.5 text-bbx-good text-xs">
              ✓
            </span>
          ) : (
            <span className="inline-block mt-1.5 text-bbx-dim text-xs">·</span>
          )}
        </div>
        <div className="px-4 py-4">
          <label className="text-sm text-bbx-text font-medium block">
            {q.label}
          </label>
          <p className="text-[10px] text-bbx-dim tracking-[0.18em] uppercase mt-1">
            {q.type === "yes_no" ? "YES / NO" : q.type.toUpperCase()}
          </p>

          <div className="mt-3">
            {q.type === "number" ? (
              <input
                type="number"
                inputMode="numeric"
                disabled={disabled}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="0"
                className="bbx-input bbx-num text-xl !py-3 max-w-[180px]"
              />
            ) : q.type === "yes_no" ? (
              <div className="grid grid-cols-2 gap-2 max-w-xs">
                {[
                  { v: "yes", label: "YES" },
                  { v: "no", label: "NO" },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(o.v)}
                    className={`px-4 py-2.5 text-sm tracking-[0.18em] font-semibold border transition-all ${
                      value === o.v
                        ? "bg-bbx-accent text-bbx-bg border-bbx-accent"
                        : "border-bbx-line text-bbx-subtext hover:border-bbx-accent hover:text-bbx-accent"
                    } disabled:opacity-60`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                disabled={disabled}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={2}
                placeholder="// type your answer"
                className="bbx-input resize-y"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function YesterdayRecap({
  checkin,
  answers,
  questions,
}: {
  checkin: Checkin;
  answers: Answer[];
  questions: Question[];
}) {
  const filled = answers.filter(
    (a) =>
      a.checkin_id === checkin.id &&
      a.value !== null &&
      a.value.trim() !== "" &&
      questions.some((q) => q.id === a.question_id)
  );
  if (filled.length === 0) return null;

  return (
    <Panel title={`${relDay(checkin.date).toUpperCase()} RECAP`}>
      <div className="p-4 space-y-2">
        {filled.slice(0, 3).map((a) => {
          const q = questions.find((x) => x.id === a.question_id);
          if (!q) return null;
          return (
            <div key={a.id} className="grid grid-cols-[1fr_auto] gap-3 text-sm">
              <span className="text-bbx-dim text-[11px] tracking-wide truncate">
                {q.label}
              </span>
              <span className="text-bbx-accent font-semibold tabular-nums text-right">
                {a.value}
              </span>
            </div>
          );
        })}
        {filled.length > 3 && (
          <p className="text-[10px] text-bbx-dim pt-1 tracking-[0.18em]">
            +{filled.length - 3} MORE
          </p>
        )}
      </div>
    </Panel>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONAL TASK ROW — tick / edit / delete
// ─────────────────────────────────────────────────────────────────────────────
function TaskRow({
  task,
  onToggle,
  onSave,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onSave: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  function startEdit() {
    setDraft(task.title);
    setEditing(true);
  }

  function commit() {
    const clean = draft.trim();
    if (!clean) {
      setEditing(false);
      setDraft(task.title);
      return;
    }
    onSave(clean);
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
    setDraft(task.title);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 border-b border-bbx-line last:border-0 bg-bbx-panel2/40">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          className="bbx-input flex-1"
        />
        <button onClick={commit} className="bbx-btn">
          SAVE
        </button>
        <button onClick={cancel} className="bbx-btn-ghost">
          CANCEL
        </button>
      </div>
    );
  }

  // Subtle age hint — only for open tasks that have been sitting for 3+ days.
  // Helps people notice stale work without nagging.
  const ageDays =
    task.status !== "done" && task.created_at ? daysAgo(task.created_at) : 0;
  const showAge = ageDays >= 3;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-bbx-line last:border-0 group hover:bg-bbx-panel2/40 transition-colors">
      <button
        onClick={onToggle}
        aria-label="Toggle done"
        className={`h-5 w-5 border grid place-items-center text-[11px] shrink-0 transition-all ${
          task.status === "done"
            ? "bg-bbx-good border-bbx-good text-bbx-bg animate-pop"
            : "border-bbx-line hover:border-bbx-accent"
        }`}
      >
        {task.status === "done" ? "✓" : ""}
      </button>
      <span
        className={`text-sm flex-1 transition-all min-w-0 ${
          task.status === "done"
            ? "line-through text-bbx-dim"
            : "text-bbx-text"
        }`}
      >
        {task.title}
        {showAge && (
          <span
            className={`ml-2 text-[10px] tracking-[0.14em] tabular-nums ${
              ageDays >= 7 ? "text-bbx-warn" : "text-bbx-dim"
            }`}
            title={`Added ${ageDays} days ago`}
          >
            · {ageDays}D
          </span>
        )}
      </span>
      <button
        onClick={startEdit}
        className="text-[10px] tracking-[0.18em] uppercase text-bbx-dim hover:text-bbx-accent opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Edit task"
      >
        EDIT
      </button>
      <button
        onClick={onDelete}
        className="text-bbx-dim hover:text-bbx-bad text-xs px-1 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Delete task"
      >
        ✕
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD TASK ROW (personal page)
// ─────────────────────────────────────────────────────────────────────────────
function AddTaskRow({ onAdd }: { onAdd: (title: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  function commit() {
    const clean = title.trim();
    if (!clean) {
      setAdding(false);
      setTitle("");
      return;
    }
    onAdd(clean);
    setTitle("");
    setAdding(false);
  }

  return (
    <div className="p-3 bg-bbx-panel2/40 border-t border-bbx-line">
      {adding ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setAdding(false);
                setTitle("");
              }
            }}
            placeholder="new task title"
            className="bbx-input flex-1"
          />
          <button onClick={commit} className="bbx-btn">
            ADD
          </button>
          <button
            onClick={() => {
              setAdding(false);
              setTitle("");
            }}
            className="bbx-btn-ghost"
          >
            CANCEL
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-xs tracking-[0.12em] uppercase text-bbx-dim hover:text-bbx-accent"
        >
          + ADD TASK
        </button>
      )}
    </div>
  );
}
