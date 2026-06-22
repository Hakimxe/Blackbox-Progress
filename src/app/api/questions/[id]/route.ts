import { NextResponse } from "next/server";
import { db, type Question } from "@/lib/db";

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
  const args: (string | number)[] = [];

  if (typeof body.label === "string" && body.label.trim()) {
    fields.push("label = ?");
    args.push(body.label.trim());
  }
  if (body.type === "number" || body.type === "text" || body.type === "yes_no") {
    fields.push("type = ?");
    args.push(body.type);
  }
  if (typeof body.active === "boolean") {
    fields.push("active = ?");
    args.push(body.active ? 1 : 0);
  }
  if (typeof body.position === "number") {
    fields.push("position = ?");
    args.push(body.position);
  }

  if (!fields.length)
    return NextResponse.json({ error: "no changes" }, { status: 400 });

  args.push(id);
  await db.prepare(`UPDATE questions SET ${fields.join(", ")} WHERE id = ?`).run(...args);
  const q = await db
    .prepare<Question>(`SELECT * FROM questions WHERE id = ?`)
    .get(id);
  return NextResponse.json(q);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  await db.prepare(`DELETE FROM questions WHERE id = ?`).run(id);
  return NextResponse.json({ ok: true });
}
