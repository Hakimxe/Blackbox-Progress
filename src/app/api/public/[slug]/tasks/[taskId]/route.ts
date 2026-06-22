import { NextResponse } from "next/server";
import { db, type Member, type Task } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public — a member editing their own task from /u/[slug].
// Ownership verified by slug. Accepts { status } and/or { title }.
export async function PATCH(
  req: Request,
  { params }: { params: { slug: string; taskId: string } }
) {
  const taskId = Number(params.taskId);
  if (!Number.isFinite(taskId)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  const member = await db
    .prepare<Member>(`SELECT * FROM members WHERE slug = ?`)
    .get(params.slug);
  if (!member) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (member.status !== "active") {
    return NextResponse.json({ error: "member paused" }, { status: 403 });
  }

  const task = await db
    .prepare<Task>(`SELECT * FROM tasks WHERE id = ? AND member_id = ?`)
    .get(taskId, member.id);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });

  const fields: string[] = [];
  const args: (string | number | null)[] = [];

  if (typeof body.title === "string" && body.title.trim()) {
    fields.push("title = ?");
    args.push(body.title.trim());
  }
  if (
    body.status === "todo" ||
    body.status === "doing" ||
    body.status === "done"
  ) {
    fields.push("status = ?");
    args.push(body.status);
    fields.push("completed_at = ?");
    args.push(body.status === "done" ? new Date().toISOString() : null);
  }

  if (!fields.length) {
    return NextResponse.json({ error: "no changes" }, { status: 400 });
  }

  args.push(taskId);
  await db
    .prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`)
    .run(...args);

  const t = await db
    .prepare<Task>(`SELECT * FROM tasks WHERE id = ?`)
    .get(taskId);
  return NextResponse.json(t);
}

// Public — a member deleting their own task from /u/[slug].
export async function DELETE(
  _req: Request,
  { params }: { params: { slug: string; taskId: string } }
) {
  const taskId = Number(params.taskId);
  if (!Number.isFinite(taskId)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }

  const member = await db
    .prepare<Member>(`SELECT * FROM members WHERE slug = ?`)
    .get(params.slug);
  if (!member) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (member.status !== "active") {
    return NextResponse.json({ error: "member paused" }, { status: 403 });
  }

  const task = await db
    .prepare<Task>(`SELECT * FROM tasks WHERE id = ? AND member_id = ?`)
    .get(taskId, member.id);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });

  await db.prepare(`DELETE FROM tasks WHERE id = ?`).run(taskId);
  return NextResponse.json({ ok: true });
}
