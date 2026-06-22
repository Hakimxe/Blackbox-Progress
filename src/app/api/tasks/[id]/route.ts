import { NextResponse } from "next/server";
import { db, type Task } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad body" }, { status: 400 });

  const fields: string[] = [];
  const args: (string | number | null)[] = [];

  if (typeof body.title === "string" && body.title.trim()) {
    fields.push("title = ?");
    args.push(body.title.trim());
  }
  if (body.status === "todo" || body.status === "doing" || body.status === "done") {
    fields.push("status = ?");
    args.push(body.status);
    fields.push("completed_at = ?");
    args.push(body.status === "done" ? new Date().toISOString() : null);
  }
  if (typeof body.due_date === "string" || body.due_date === null) {
    fields.push("due_date = ?");
    args.push(body.due_date);
  }

  if (!fields.length)
    return NextResponse.json({ error: "no changes" }, { status: 400 });

  args.push(id);
  await db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`).run(...args);
  const t = await db
    .prepare<Task>(`SELECT * FROM tasks WHERE id = ?`)
    .get(id);
  return NextResponse.json(t);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  await db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id);
  return NextResponse.json({ ok: true });
}
