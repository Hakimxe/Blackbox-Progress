import { NextResponse } from "next/server";
import { db, type Member, type Task, type Question, type Checkin, type Answer } from "@/lib/db";
import { runSeedIfNeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  await runSeedIfNeeded();
  const member = await db
    .prepare<Member>(`SELECT * FROM members WHERE slug = ?`)
    .get(params.slug);
  if (!member) return NextResponse.json({ error: "not found" }, { status: 404 });

  const tasks = await db
    .prepare<Task>(
      `SELECT * FROM tasks WHERE member_id = ? ORDER BY status='done' ASC, priority DESC, created_at ASC`
    )
    .all(member.id);

  const questions = await db
    .prepare<Question>(
      `SELECT * FROM questions WHERE member_id = ? AND active = 1 ORDER BY position ASC, id ASC`
    )
    .all(member.id);

  const checkins = await db
    .prepare<Checkin>(
      `SELECT * FROM checkins WHERE member_id = ? ORDER BY date DESC LIMIT 14`
    )
    .all(member.id);

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
