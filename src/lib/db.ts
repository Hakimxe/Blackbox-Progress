import { createClient, type Client, type InValue } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL ?? "file:./data/app.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

declare global {
  // eslint-disable-next-line no-var
  var __client: Client | undefined;
  // eslint-disable-next-line no-var
  var __dbInitDone: boolean | undefined;
}

const client: Client =
  global.__client ??
  createClient({
    url,
    ...(authToken ? { authToken } : {}),
  });

if (process.env.NODE_ENV !== "production") {
  global.__client = client;
}

async function ensureSchema(): Promise<void> {
  if (global.__dbInitDone) return;

  await client.execute(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      slug TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      priority TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Idempotent migration: ensure 'priority' column on members
  try {
    const cols = await client.execute(`PRAGMA table_info(members)`);
    const hasPriority = cols.rows.some(
      (r) => (r.name as string) === "priority"
    );
    if (!hasPriority) {
      await client.execute(
        `ALTER TABLE members ADD COLUMN priority TEXT NOT NULL DEFAULT ''`
      );
    }
  } catch {
    // ignore
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo',
      priority INTEGER NOT NULL DEFAULT 0,
      due_date TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      position INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      locked INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(member_id, date),
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checkin_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      value TEXT,
      UNIQUE(checkin_id, question_id),
      FOREIGN KEY (checkin_id) REFERENCES checkins(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);

  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_tasks_member ON tasks(member_id, status)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_checkins_member_date ON checkins(member_id, date)`
  );

  global.__dbInitDone = true;
}

type Args = (string | number | bigint | null | Uint8Array)[];

function toInValues(args: Args): InValue[] {
  return args.map((a) => a as InValue);
}

export interface PreparedStatement<R = Record<string, unknown>> {
  all: (...args: Args) => Promise<R[]>;
  get: (...args: Args) => Promise<R | undefined>;
  run: (...args: Args) => Promise<{ lastInsertRowid: number; changes: number }>;
}

function prepare<R = Record<string, unknown>>(
  sql: string
): PreparedStatement<R> {
  return {
    async all(...args: Args) {
      await ensureSchema();
      const res = await client.execute({ sql, args: toInValues(args) });
      return res.rows as unknown as R[];
    },
    async get(...args: Args) {
      await ensureSchema();
      const res = await client.execute({ sql, args: toInValues(args) });
      return (res.rows[0] as unknown as R) ?? undefined;
    },
    async run(...args: Args) {
      await ensureSchema();
      const res = await client.execute({ sql, args: toInValues(args) });
      return {
        lastInsertRowid: Number(res.lastInsertRowid ?? 0),
        changes: res.rowsAffected,
      };
    },
  };
}

export const db = {
  prepare,
  raw: client,
  ensureSchema,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type Member = {
  id: number;
  name: string;
  role: string;
  slug: string;
  status: "active" | "paused";
  priority: string;
  created_at: string;
};

export type Task = {
  id: number;
  member_id: number;
  title: string;
  status: "todo" | "doing" | "done";
  priority: number;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

export type Question = {
  id: number;
  member_id: number;
  label: string;
  type: "number" | "text" | "yes_no";
  position: number;
  active: number;
  created_at: string;
};

export type Checkin = {
  id: number;
  member_id: number;
  date: string;
  locked: number;
  created_at: string;
  updated_at: string;
};

export type Answer = {
  id: number;
  checkin_id: number;
  question_id: number;
  value: string | null;
};
