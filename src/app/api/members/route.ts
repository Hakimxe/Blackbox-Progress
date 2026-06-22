import { NextResponse } from "next/server";
import { db, type Member } from "@/lib/db";
import { slugify, ymd } from "@/lib/utils";
import { runSeedIfNeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

type MemberWithStats = Member & {
  total_tasks: number;
  done_tasks: number;
  question_count: number;
  answered_today: number;
  has_checked_in_today: number;
};

export async function GET() {
  await runSeedIfNeeded();
  const today = ymd();
  const rows = await db
    .prepare<MemberWithStats>(
      `
      SELECT
        m.*,
        (SELECT COUNT(*) FROM tasks t WHERE t.member_id = m.id) AS total_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.member_id = m.id AND t.status='done') AS done_tasks,
        (SELECT COUNT(*) FROM questions q WHERE q.member_id = m.id AND q.active=1) AS question_count,
        (
          SELECT COUNT(*) FROM answers a
          JOIN checkins c ON c.id = a.checkin_id
          JOIN questions q2 ON q2.id = a.question_id
          WHERE c.member_id = m.id AND c.date = ? AND q2.active = 1 AND a.value IS NOT NULL AND TRIM(a.value) != ''
        ) AS answered_today,
        (SELECT COUNT(*) FROM checkins c2 WHERE c2.member_id = m.id AND c2.date = ?) AS has_checked_in_today
      FROM members m
      ORDER BY m.created_at ASC
    `
    )
    .all(today, today);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const role = typeof body.role === "string" ? body.role : "";
  const priority =
    typeof body.priority === "string" ? body.priority.trim() : "";
  const slug = slugify(body.name);
  const ins = await db
    .prepare(
      `INSERT INTO members (name, role, slug, status, priority) VALUES (?, ?, ?, 'active', ?)`
    )
    .run(body.name.trim(), role.trim(), slug, priority);
  const m = await db
    .prepare<Member>(`SELECT * FROM members WHERE id = ?`)
    .get(ins.lastInsertRowid);
  return NextResponse.json(m, { status: 201 });
}
