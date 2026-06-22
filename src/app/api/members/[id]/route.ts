import { NextResponse } from "next/server";
import { db, type Member, type Task, type Question, type Checkin, type Answer } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  const member = await db
    .prepare<Member>(`SELECT * FROM members WHERE id = ?`)
    .get(id);
  if (!member) return NextResponse.json({ error: "not found" }, { status: 404 });

  const tasks = await db
    .prepare<Task>(
      `SELECT * FROM tasks WHERE member_id = ? ORDER BY status='done' ASC, priority DESC, created_at ASC`
    )
    .all(id);
  const questions = await db
    .prepare<Question>(
      `SELECT * FROM questions WHERE member_id = ? ORDER BY position ASC, id ASC`
    )
    .all(id);
  const checkins = await db
    .prepare<Checkin>(
      `SELECT * FROM checkins WHERE member_id = ? ORDER BY date DESC LIMIT 30`
    )
    .all(id);

  const checkinIds = checkins.map((c) => c.id);
  let answers: Answer[] = [];
  if (checkinIds.length) {
    const placeholders = checkinIds.map(() => "?").join(",");
    answers = await db
      .prepare<Answer>(
        `SELECT * FROM answers WHERE checkin_id IN (${placeholders})`
      )
      .all(...checkinIds);
  }

  return NextResponse.json({ member, tasks, questions, checkins, answers });
}

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
  const args: (string | number)[] = [];
  if (typeof body.name === "string" && body.name.trim()) {
    fields.push("name = ?");
    args.push(body.name.trim());
  }
  if (typeof body.role === "string") {
    fields.push("role = ?");
    args.push(body.role.trim());
  }
  if (body.status === "active" || body.status === "paused") {
    fields.push("status = ?");
    args.push(body.status);
  }
  if (typeof body.priority === "string") {
    fields.push("priority = ?");
    args.push(body.priority.trim());
  }
  if (!fields.length)
    return NextResponse.json({ error: "no changes" }, { status: 400 });

  args.push(id);
  await db.prepare(`UPDATE members SET ${fields.join(", ")} WHERE id = ?`).run(...args);
  const m = await db
    .prepare<Member>(`SELECT * FROM members WHERE id = ?`)
    .get(id);
  return NextResponse.json(m);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  await db.prepare(`DELETE FROM members WHERE id = ?`).run(id);
  return NextResponse.json({ ok: true });
}
