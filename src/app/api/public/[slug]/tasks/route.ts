import { NextResponse } from "next/server";
import { db, type Member, type Task } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public — a member adding a task to their own list from /u/[slug].
// Ownership verified by slug.
export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const member = await db
    .prepare<Member>(`SELECT * FROM members WHERE slug = ?`)
    .get(params.slug);
  if (!member) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (member.status !== "active") {
    return NextResponse.json({ error: "member paused" }, { status: 403 });
  }

  const ins = await db
    .prepare(
      `INSERT INTO tasks (member_id, title, status, priority, due_date) VALUES (?, ?, 'todo', 0, NULL)`
    )
    .run(member.id, body.title.trim());
  const t = await db
    .prepare<Task>(`SELECT * FROM tasks WHERE id = ?`)
    .get(ins.lastInsertRowid);
  return NextResponse.json(t, { status: 201 });
}
