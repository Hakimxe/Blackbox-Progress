import { NextResponse } from "next/server";
import { db, type Task } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const memberId = Number(params.id);
  if (!Number.isFinite(memberId)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }
  const due = typeof body.due_date === "string" ? body.due_date : null;
  const ins = await db
    .prepare(
      `INSERT INTO tasks (member_id, title, status, priority, due_date) VALUES (?, ?, 'todo', 0, ?)`
    )
    .run(memberId, body.title.trim(), due);
  const t = await db
    .prepare<Task>(`SELECT * FROM tasks WHERE id = ?`)
    .get(ins.lastInsertRowid);
  return NextResponse.json(t, { status: 201 });
}
