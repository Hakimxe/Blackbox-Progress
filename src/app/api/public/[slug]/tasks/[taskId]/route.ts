import { NextResponse } from "next/server";
import { db, type Member, type Task } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public — a member toggling their own task status from their personal page.
// We verify ownership via the slug.
export async function PATCH(
  req: Request,
  { params }: { params: { slug: string; taskId: string } }
) {
  const taskId = Number(params.taskId);
  if (!Number.isFinite(taskId)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  if (
    !body ||
    (body.status !== "todo" &&
      body.status !== "doing" &&
      body.status !== "done")
  ) {
    return NextResponse.json({ error: "bad status" }, { status: 400 });
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

  await db
    .prepare(
      `UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?`
    )
    .run(
      body.status,
      body.status === "done" ? new Date().toISOString() : null,
      taskId
    );

  const t = await db
    .prepare<Task>(`SELECT * FROM tasks WHERE id = ?`)
    .get(taskId);
  return NextResponse.json(t);
}
