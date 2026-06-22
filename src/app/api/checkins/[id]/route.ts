import { NextResponse } from "next/server";
import { db, type Checkin } from "@/lib/db";

export const dynamic = "force-dynamic";

// Manager override — can edit answers or unlock a check-in
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

  if (typeof body.locked === "boolean") {
    await db
      .prepare(
        `UPDATE checkins SET locked = ?, updated_at = datetime('now') WHERE id = ?`
      )
      .run(body.locked ? 1 : 0, id);
  }

  if (Array.isArray(body.answers)) {
    for (const a of body.answers) {
      if (!a || typeof a.question_id !== "number") continue;
      const value =
        a.value === null || a.value === undefined ? "" : String(a.value);
      await db
        .prepare(
          `INSERT INTO answers (checkin_id, question_id, value) VALUES (?, ?, ?)
           ON CONFLICT(checkin_id, question_id) DO UPDATE SET value = excluded.value`
        )
        .run(id, a.question_id, value);
    }
    await db
      .prepare(`UPDATE checkins SET updated_at = datetime('now') WHERE id = ?`)
      .run(id);
  }

  const c = await db
    .prepare<Checkin>(`SELECT * FROM checkins WHERE id = ?`)
    .get(id);
  return NextResponse.json(c);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  await db.prepare(`DELETE FROM checkins WHERE id = ?`).run(id);
  return NextResponse.json({ ok: true });
}
