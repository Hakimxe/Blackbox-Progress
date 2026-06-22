import { NextResponse } from "next/server";
import { db, type Member, type Checkin } from "@/lib/db";
import { ymd } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Public endpoint — used by members to submit today's check-in via their slug.
// Body: { slug: string, date?: string, answers: { question_id: number, value: string }[] }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.slug !== "string" || !Array.isArray(body.answers)) {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  const member = await db
    .prepare<Member>(`SELECT * FROM members WHERE slug = ?`)
    .get(body.slug);
  if (!member) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (member.status !== "active") {
    return NextResponse.json({ error: "member paused" }, { status: 403 });
  }

  const date = typeof body.date === "string" && body.date ? body.date : ymd();

  // Find or create checkin for the day.
  // NOTE: the `locked` flag is kept (still flipped to 1 on submit so we can show
  // "SUBMITTED" state) but it no longer prevents the same member from updating
  // their own answers later in the day. People asked for the ability to edit.
  let checkin = await db
    .prepare<Checkin>(
      `SELECT * FROM checkins WHERE member_id = ? AND date = ?`
    )
    .get(member.id, date);

  if (!checkin) {
    const ins = await db
      .prepare(
        `INSERT INTO checkins (member_id, date, locked) VALUES (?, ?, 1)`
      )
      .run(member.id, date);
    checkin = await db
      .prepare<Checkin>(`SELECT * FROM checkins WHERE id = ?`)
      .get(ins.lastInsertRowid);
  } else {
    await db
      .prepare(
        `UPDATE checkins SET locked = 1, updated_at = datetime('now') WHERE id = ?`
      )
      .run(checkin.id);
  }

  if (!checkin) {
    return NextResponse.json({ error: "failed to create checkin" }, { status: 500 });
  }

  // Upsert each answer
  for (const a of body.answers) {
    if (!a || typeof a.question_id !== "number") continue;
    const value =
      a.value === null || a.value === undefined ? "" : String(a.value);
    await db
      .prepare(
        `INSERT INTO answers (checkin_id, question_id, value) VALUES (?, ?, ?)
         ON CONFLICT(checkin_id, question_id) DO UPDATE SET value = excluded.value`
      )
      .run(checkin.id, a.question_id, value);
  }

  return NextResponse.json({ ok: true, checkin });
}
