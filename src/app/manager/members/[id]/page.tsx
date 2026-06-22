"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import ProgressBar from "@/components/ProgressBar";
import { Panel } from "@/components/Panel";
import { pct, prettyDate, relDay, ymd } from "@/lib/utils";

type Member = {
  id: number;
  name: string;
  role: string;
  slug: string;
  status: "active" | "paused";
  priority: string;
  created_at: string;
};
type Task = {
  id: number;
  member_id: number;
  title: string;
  status: "todo" | "doing" | "done";
  priority: number;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};
type Question = {
  id: number;
  member_id: number;
  label: string;
  type: "number" | "text" | "yes_no";
  position: number;
  active: number;
};
type Checkin = {
  id: number;
  member_id: number;
  date: string;
  locked: number;
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

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [data, setData] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await fetch(`/api/members/${id}`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <main className="max-w-5xl mx-auto px-5 py-8 text-sm text-bbx-dim">
          Loading…<span className="animate-caret">▌</span>
        </main>
      </div>
    );
  }

  const { member, tasks, questions, checkins, answers } = data;
  const today = ymd();
  const activeQuestions = questions.filter((q) => q.active === 1);
  const todayCheckin = checkins.find((c) => c.date === today);
  const todayAnswered = answers.filter(
    (a) =>
      a.checkin_id === todayCheckin?.id &&
      a.value !== null &&
      a.value.trim() !== "" &&
      activeQuestions.some((q) => q.id === a.question_id)
  ).length;
  const todayPct = pct(todayAnswered, activeQuestions.length);
  const tasksDone = tasks.filter((t) => t.status === "done").length;
  const tasksPct = pct(tasksDone, tasks.length);
  const pastCheckins = checkins.filter((c) => c.date !== today);

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="max-w-5xl mx-auto px-5 py-8 pb-24 space-y-6">
        <div>
          <Link
            href="/manager"
            className="text-[10px] tracking-[0.18em] uppercase text-bbx-dim hover:text-bbx-accent"
          >
            ← BACK TO TEAM
          </Link>
        </div>

        {/* HERO */}
        <div className="bbx-panel">
          <div className="bbx-panel-header">
            <div className="flex items-center gap-2">
              <span className="text-bbx-accent">▸</span>
              <span>profile</span>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="bbx-btn-ghost"
            >
              EDIT
            </button>
          </div>
          <div className="p-6">
            <div className="flex items-start gap-5">
              <div className="h-14 w-14 bg-bbx-panel2 border border-bbx-line text-bbx-accent grid place-items-center font-bold text-2xl shrink-0">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-semibold tracking-wide text-bbx-text">
                  {member.name.toUpperCase()}
                </h1>
                <p className="text-[11px] text-bbx-dim tracking-[0.14em] uppercase mt-1">
                  {member.role}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-2 px-2 py-1 border border-bbx-line ${
                      member.status === "active"
                        ? "text-bbx-good"
                        : "text-bbx-warn"
                    }`}
                  >
                    <span
                      className={`bbx-dot ${
                        member.status === "active"
                          ? "bg-bbx-good"
                          : "bg-bbx-warn"
                      }`}
                    />
                    <span className="text-[10px] tracking-[0.18em] font-semibold">
                      {member.status.toUpperCase()}
                    </span>
                  </span>
                  <a
                    href={`/u/${member.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-bbx-dim hover:text-bbx-accent font-mono"
                  >
                    /u/{member.slug} ↗
                  </a>
                </div>
              </div>
            </div>

            {member.priority && (
              <div className="mt-6 border border-bbx-accent/30 bg-bbx-accent/5 p-4">
                <p className="text-[10px] text-bbx-accent tracking-[0.18em] font-semibold flex items-center gap-1.5">
                  <span>▸</span> PRIORITY
                </p>
                <p className="text-sm text-bbx-text mt-2 leading-relaxed">
                  {member.priority}
                </p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-3 mt-6">
              <div className="bbx-panel-raised p-4">
                <ProgressBar
                  percent={todayPct}
                  label={`TODAY ${todayAnswered}/${activeQuestions.length}`}
                />
              </div>
              <div className="bbx-panel-raised p-4">
                <ProgressBar
                  percent={tasksPct}
                  label={`TASKS ${tasksDone}/${tasks.length}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* TODAY'S CHECK-IN */}
        <TodayCheckinCard
          checkin={todayCheckin ?? null}
          questions={activeQuestions}
          answers={answers}
          onChange={fetchData}
        />

        {/* TASKS */}
        <Panel
          title={`TASKS // ${tasksDone}/${tasks.length}`}
          subtitle="what this person owns"
        >
          <TasksEditor tasks={tasks} memberId={member.id} onChange={fetchData} />
        </Panel>

        {/* QUESTION TEMPLATE */}
        <Panel
          title={`CHECK-IN TEMPLATE // ${activeQuestions.length} Q`}
          subtitle={`fresh form for ${member.name} every morning`}
        >
          <QuestionsEditor
            questions={questions}
            memberId={member.id}
            onChange={fetchData}
          />
        </Panel>

        {/* HISTORY */}
        <div>
          <button
            onClick={() => setShowHistory((s) => !s)}
            className="bbx-panel w-full px-4 py-3 flex items-center justify-between hover:border-bbx-accent transition-colors"
          >
            <div className="text-left flex items-center gap-2">
              <span className="text-bbx-accent">▸</span>
              <span className="text-xs tracking-[0.18em] uppercase">
                PAST CHECK-INS // {pastCheckins.length}
              </span>
            </div>
            <span className="text-bbx-dim text-xs tracking-[0.18em] uppercase">
              {showHistory ? "HIDE ▲" : "SHOW ▼"}
            </span>
          </button>

          {showHistory && pastCheckins.length > 0 && (
            <div className="mt-3 space-y-3">
              {pastCheckins.map((c) => (
                <HistoryRow
                  key={c.id}
                  checkin={c}
                  questions={activeQuestions}
                  answers={answers}
                  onChange={fetchData}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {editing && (
        <EditMemberModal
          member={member}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            fetchData();
          }}
          onDeleted={() => router.push("/manager")}
        />
      )}
    </div>
  );
}

function TopBar() {
  return (
    <header className="border-b border-bbx-line bg-bbx-bg/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo />
          <span className="hidden md:inline text-[10px] tracking-[0.22em] uppercase text-bbx-dim">
            / member
          </span>
        </div>
        <Link href="/manager" className="bbx-btn-ghost">
          DASHBOARD
        </Link>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TODAY'S CHECK-IN
// ─────────────────────────────────────────────────────────────────────────────
function TodayCheckinCard({
  checkin,
  questions,
  answers,
  onChange,
}: {
  checkin: Checkin | null;
  questions: Question[];
  answers: Answer[];
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const filledMap = useMemo(() => {
    const m: Record<number, string> = {};
    if (!checkin) return m;
    for (const q of questions) {
      const a = answers.find(
        (x) => x.checkin_id === checkin.id && x.question_id === q.id
      );
      m[q.id] = a?.value ?? "";
    }
    return m;
  }, [checkin, questions, answers]);

  function startEdit() {
    setDraft(filledMap);
    setEditing(true);
  }

  async function save() {
    if (!checkin) return;
    setSaving(true);
    await fetch(`/api/checkins/${checkin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: Object.entries(draft).map(([qid, value]) => ({
          question_id: Number(qid),
          value,
        })),
      }),
    });
    setSaving(false);
    setEditing(false);
    onChange();
  }

  if (questions.length === 0) {
    return (
      <Panel title="TODAY'S CHECK-IN">
        <div className="p-5 text-sm text-bbx-dim">
          No check-in questions configured yet. Add some in the template below.
        </div>
      </Panel>
    );
  }

  if (!checkin) {
    return (
      <Panel
        title="TODAY'S CHECK-IN"
        right={
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-bbx-accent">
            <span className="bbx-dot bg-bbx-accent animate-pulse-dot" />
            <span className="text-[10px] tracking-[0.18em]">PENDING</span>
          </span>
        }
      >
        <div className="p-5">
          <p className="text-sm text-bbx-subtext">
            Not submitted yet today.{" "}
            <span className="text-bbx-accent">{questions.length}</span> question
            {questions.length === 1 ? "" : "s"} waiting on the personal link.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="TODAY'S CHECK-IN"
      right={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-bbx-good">
            <span className="bbx-dot bg-bbx-good" />
            <span className="text-[10px] tracking-[0.18em]">
              SUBMITTED{checkin.locked ? " · LOCKED" : ""}
            </span>
          </span>
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="bbx-btn-ghost">
                CANCEL
              </button>
              <button onClick={save} disabled={saving} className="bbx-btn">
                {saving ? "SAVING…" : "SAVE"}
              </button>
            </>
          ) : (
            <button onClick={startEdit} className="bbx-btn-ghost">
              OVERRIDE
            </button>
          )}
        </div>
      }
    >
      <div>
        {questions.map((q, idx) => {
          const v = editing ? draft[q.id] ?? "" : filledMap[q.id] ?? "";
          const isEmpty = !v.trim();
          return (
            <div
              key={q.id}
              className="grid grid-cols-[auto_1fr] border-b border-bbx-line last:border-0"
            >
              <div className="px-4 py-3 border-r border-bbx-line bg-bbx-panel2/40 min-w-[120px]">
                <p className="text-[10px] text-bbx-dim tracking-[0.18em] uppercase">
                  Q{String(idx + 1).padStart(2, "0")}
                </p>
                <p className="text-[11px] text-bbx-subtext mt-1.5 leading-snug">
                  {q.label}
                </p>
              </div>
              <div className="px-4 py-3">
                {editing ? (
                  q.type === "number" ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={v}
                      onChange={(e) =>
                        setDraft({ ...draft, [q.id]: e.target.value })
                      }
                      className="bbx-input"
                    />
                  ) : q.type === "yes_no" ? (
                    <select
                      value={v}
                      onChange={(e) =>
                        setDraft({ ...draft, [q.id]: e.target.value })
                      }
                      className="bbx-input"
                    >
                      <option value="">—</option>
                      <option value="yes">YES</option>
                      <option value="no">NO</option>
                    </select>
                  ) : (
                    <textarea
                      value={v}
                      rows={2}
                      onChange={(e) =>
                        setDraft({ ...draft, [q.id]: e.target.value })
                      }
                      className="bbx-input resize-y"
                    />
                  )
                ) : (
                  <p
                    className={`text-sm ${
                      isEmpty
                        ? "text-bbx-dim italic"
                        : "text-bbx-text font-medium"
                    }`}
                  >
                    {isEmpty ? "— not answered —" : v}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────────────────────────────────────
function TasksEditor({
  tasks,
  memberId,
  onChange,
}: {
  tasks: Task[];
  memberId: number;
  onChange: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  async function addTask() {
    if (!newTitle.trim()) return;
    await fetch(`/api/members/${memberId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    setNewTitle("");
    setAdding(false);
    onChange();
  }

  async function setStatus(id: number, status: Task["status"]) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onChange();
  }

  async function del(id: number) {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div>
      {tasks.length === 0 && (
        <p className="text-sm text-bbx-dim p-5">No tasks yet.</p>
      )}
      {tasks.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-4 py-3 border-b border-bbx-line last:border-0 group"
        >
          <button
            onClick={() =>
              setStatus(t.id, t.status === "done" ? "todo" : "done")
            }
            className={`h-5 w-5 border grid place-items-center text-[11px] shrink-0 transition-all ${
              t.status === "done"
                ? "bg-bbx-good border-bbx-good text-bbx-bg"
                : "border-bbx-line hover:border-bbx-accent"
            }`}
            aria-label="Toggle done"
          >
            {t.status === "done" ? "✓" : ""}
          </button>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm ${
                t.status === "done"
                  ? "line-through text-bbx-dim"
                  : "text-bbx-text"
              }`}
            >
              {t.title}
            </p>
          </div>
          <select
            value={t.status}
            onChange={(e) => setStatus(t.id, e.target.value as Task["status"])}
            className="bbx-input !w-auto !py-1 !px-2 text-[10px] tracking-[0.12em] uppercase"
          >
            <option value="todo">TO DO</option>
            <option value="doing">IN PROGRESS</option>
            <option value="done">DONE</option>
          </select>
          <button
            onClick={() => del(t.id)}
            className="text-bbx-dim hover:text-bbx-bad text-xs px-1"
            aria-label="Delete task"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="p-3 bg-bbx-panel2/40 border-t border-bbx-line">
        {adding ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="new task title"
              className="bbx-input flex-1"
            />
            <button onClick={addTask} className="bbx-btn">
              ADD
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setNewTitle("");
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTIONS (TEMPLATE)
// ─────────────────────────────────────────────────────────────────────────────
function QuestionsEditor({
  questions,
  memberId,
  onChange,
}: {
  questions: Question[];
  memberId: number;
  onChange: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<Question["type"]>("text");

  async function addQ() {
    if (!label.trim()) return;
    await fetch(`/api/members/${memberId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, type }),
    });
    setLabel("");
    setType("text");
    setAdding(false);
    onChange();
  }

  async function toggleActive(q: Question) {
    await fetch(`/api/questions/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: q.active === 0 }),
    });
    onChange();
  }

  async function del(id: number) {
    if (
      !confirm("Delete this question? All past answers will also be removed.")
    )
      return;
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div>
      {questions.length === 0 && (
        <p className="text-sm text-bbx-dim p-5">No questions yet.</p>
      )}
      {questions.map((q, idx) => (
        <div
          key={q.id}
          className="flex items-center gap-3 px-4 py-3 border-b border-bbx-line last:border-0"
        >
          <span className="text-[10px] text-bbx-dim tracking-[0.18em] w-7">
            Q{String(idx + 1).padStart(2, "0")}
          </span>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm ${
                q.active ? "text-bbx-text" : "text-bbx-dim line-through"
              }`}
            >
              {q.label}
            </p>
            <span
              className={`inline-block text-[9px] font-semibold tracking-[0.18em] mt-1 px-1.5 py-0.5 border border-bbx-line ${
                q.type === "number"
                  ? "text-bbx-accent"
                  : q.type === "yes_no"
                  ? "text-bbx-warn"
                  : "text-bbx-subtext"
              }`}
            >
              {q.type === "yes_no" ? "YES/NO" : q.type.toUpperCase()}
            </span>
          </div>
          <button
            onClick={() => toggleActive(q)}
            className={`text-[10px] tracking-[0.18em] px-2 py-1 border ${
              q.active
                ? "text-bbx-good border-bbx-good/40"
                : "text-bbx-dim border-bbx-line"
            }`}
          >
            {q.active ? "ACTIVE" : "HIDDEN"}
          </button>
          <button
            onClick={() => del(q.id)}
            className="text-bbx-dim hover:text-bbx-bad text-xs px-1"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="p-3 bg-bbx-panel2/40 border-t border-bbx-line">
        {adding ? (
          <div className="flex gap-2 flex-wrap">
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addQ()}
              placeholder="question label"
              className="bbx-input flex-1 min-w-[200px]"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Question["type"])}
              className="bbx-input !w-auto"
            >
              <option value="text">TEXT</option>
              <option value="number">NUMBER</option>
              <option value="yes_no">YES / NO</option>
            </select>
            <button onClick={addQ} className="bbx-btn">
              ADD
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setLabel("");
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
            + ADD QUESTION
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY ROW
// ─────────────────────────────────────────────────────────────────────────────
function HistoryRow({
  checkin,
  questions,
  answers,
  onChange,
}: {
  checkin: Checkin;
  questions: Question[];
  answers: Answer[];
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<number, string>>({});

  function startEdit() {
    const m: Record<number, string> = {};
    for (const q of questions) {
      const a = answers.find(
        (x) => x.checkin_id === checkin.id && x.question_id === q.id
      );
      m[q.id] = a?.value ?? "";
    }
    setDraft(m);
    setEditing(true);
  }

  async function save() {
    await fetch(`/api/checkins/${checkin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: Object.entries(draft).map(([qid, value]) => ({
          question_id: Number(qid),
          value,
        })),
      }),
    });
    setEditing(false);
    onChange();
  }

  async function del() {
    if (!confirm(`Delete check-in for ${prettyDate(checkin.date)}?`)) return;
    await fetch(`/api/checkins/${checkin.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <Panel
      title={relDay(checkin.date).toUpperCase()}
      subtitle={`${prettyDate(checkin.date)} · ${
        checkin.locked ? "locked" : "open"
      }`}
      right={
        editing ? (
          <>
            <button onClick={() => setEditing(false)} className="bbx-btn-ghost">
              CANCEL
            </button>
            <button onClick={save} className="bbx-btn">
              SAVE
            </button>
          </>
        ) : (
          <>
            <button onClick={startEdit} className="bbx-btn-ghost">
              EDIT
            </button>
            <button onClick={del} className="bbx-btn-ghost bbx-btn-danger">
              DELETE
            </button>
          </>
        )
      }
    >
      <div>
        {questions.map((q, idx) => {
          const a = answers.find(
            (x) => x.checkin_id === checkin.id && x.question_id === q.id
          );
          return (
            <div
              key={q.id}
              className="grid grid-cols-[auto_1fr] border-b border-bbx-line last:border-0"
            >
              <div className="px-4 py-2.5 border-r border-bbx-line bg-bbx-panel2/40 min-w-[120px]">
                <p className="text-[10px] text-bbx-dim tracking-[0.18em] uppercase">
                  Q{String(idx + 1).padStart(2, "0")}
                </p>
                <p className="text-[11px] text-bbx-subtext mt-1 leading-snug">
                  {q.label}
                </p>
              </div>
              <div className="px-4 py-2.5">
                {editing ? (
                  <input
                    value={draft[q.id] ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, [q.id]: e.target.value })
                    }
                    className="bbx-input"
                  />
                ) : (
                  <p
                    className={`text-sm ${
                      a?.value ? "text-bbx-text" : "text-bbx-dim italic"
                    }`}
                  >
                    {a?.value || "—"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT MEMBER MODAL
// ─────────────────────────────────────────────────────────────────────────────
function EditMemberModal({
  member,
  onClose,
  onSaved,
  onDeleted,
}: {
  member: Member;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState(member.role);
  const [priority, setPriority] = useState(member.priority || "");
  const [status, setStatus] = useState<"active" | "paused">(member.status);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, status, priority }),
    });
    onSaved();
  }

  async function del() {
    if (
      !confirm(
        `Delete ${member.name}? All their tasks, questions and history will be removed permanently.`
      )
    )
      return;
    await fetch(`/api/members/${member.id}`, { method: "DELETE" });
    onDeleted();
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
            <span>edit / member</span>
          </div>
          <button onClick={onClose} className="text-bbx-dim hover:text-bbx-text">
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="NAME" value={name} onChange={setName} />
          <Field label="ROLE" value={role} onChange={setRole} />
          <div>
            <label className="bbx-label block mb-1.5 flex items-center gap-1.5">
              <span className="text-bbx-accent">▸</span> PRIORITY
            </label>
            <textarea
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              rows={3}
              placeholder="// one sentence north-star for this person"
              className="bbx-input resize-y"
            />
          </div>
          <div>
            <label className="bbx-label block mb-2 flex items-center gap-1.5">
              <span className="text-bbx-accent">▸</span> STATUS
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setStatus("active")}
                className={`px-3 py-2 text-xs tracking-[0.18em] border ${
                  status === "active"
                    ? "border-bbx-good text-bbx-good bg-bbx-good/10"
                    : "border-bbx-line text-bbx-dim"
                }`}
              >
                ● ACTIVE
              </button>
              <button
                onClick={() => setStatus("paused")}
                className={`px-3 py-2 text-xs tracking-[0.18em] border ${
                  status === "paused"
                    ? "border-bbx-warn text-bbx-warn bg-bbx-warn/10"
                    : "border-bbx-line text-bbx-dim"
                }`}
              >
                ◐ PAUSED
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-bbx-line">
            <button onClick={del} className="bbx-btn-ghost bbx-btn-danger">
              DELETE
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="bbx-btn-ghost">
                CANCEL
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="bbx-btn"
              >
                {saving ? "SAVING…" : "SAVE"}
              </button>
            </div>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="bbx-label block mb-1.5 flex items-center gap-1.5">
        <span className="text-bbx-accent">▸</span> {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bbx-input"
      />
    </div>
  );
}
