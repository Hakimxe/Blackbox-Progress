import { NextResponse } from "next/server";
import { db, type Question } from "@/lib/db";

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
  if (!body || typeof body.label !== "string" || !body.label.trim()) {
    return NextResponse.json({ error: "label required" }, { status: 400 });
  }
  const type =
    body.type === "number" || body.type === "yes_no" ? body.type : "text";

  const pos = await db
    .prepare<{ p: number }>(
      `SELECT COALESCE(MAX(position), -1) + 1 AS p FROM questions WHERE member_id = ?`
    )
    .get(memberId);
  const position = Number(pos?.p ?? 0);

  const ins = await db
    .prepare(
      `INSERT INTO questions (member_id, label, type, position, active) VALUES (?, ?, ?, ?, 1)`
    )
    .run(memberId, body.label.trim(), type, position);
  const q = await db
    .prepare<Question>(`SELECT * FROM questions WHERE id = ?`)
    .get(ins.lastInsertRowid);
  return NextResponse.json(q, { status: 201 });
}
