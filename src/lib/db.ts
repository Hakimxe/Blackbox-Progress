import { createClient, type Client, type InValue } from "@libsql/client";

declare global {
  // eslint-disable-next-line no-var
  var __client: Client | undefined;
  // eslint-disable-next-line no-var
  var __dbInitDone: boolean | undefined;
}

/**
 * Lazy client factory.
 *
 * We MUST NOT construct the libsql client at module-load time. Next.js
 * imports route modules during the build's "Collecting page data" phase,
 * and on Vercel the build FS is read-only — opening the default
 * `file:./data/app.db` URL would throw `ConnectionFailed`.
 *
 * By creating the client only on the first actual query, the build never
 * touches the database, and at runtime each route reuses a cached
 * instance via the `global.__client` singleton.
 */
function getClient(): Client {
  if (global.__client) return global.__client;

  const url = process.env.TURSO_DATABASE_URL ?? "file:./data/app.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const c = createClient({
    url,
    ...(authToken ? { authToken } : {}),
  });

  global.__client = c;
  return c;
}

async function ensureSchema(): Promise<void> {
  if (global.__dbInitDone) return;

  await getClient().execute(`
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
    const cols = await getClient().execute(`PRAGMA table_info(members)`);
    const hasPriority = cols.rows.some(
      (r) => (r.name as string) === "priority"
    );
    if (!hasPriority) {
      await getClient().execute(
        `ALTER TABLE members ADD COLUMN priority TEXT NOT NULL DEFAULT ''`
      );
    }
  } catch {
    // ignore
  }

  await getClient().execute(`
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

  await getClient().execute(`
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

  await getClient().execute(`
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

  await getClient().execute(`
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

  await getClient().execute(
    `CREATE INDEX IF NOT EXISTS idx_tasks_member ON tasks(member_id, status)`
  );
  await getClient().execute(
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
      const res = await getClient().execute({ sql, args: toInValues(args) });
      return res.rows as unknown as R[];
    },
    async get(...args: Args) {
      await ensureSchema();
      const res = await getClient().execute({ sql, args: toInValues(args) });
      return (res.rows[0] as unknown as R) ?? undefined;
    },
    async run(...args: Args) {
      await ensureSchema();
      const res = await getClient().execute({ sql, args: toInValues(args) });
      return {
        lastInsertRowid: Number(res.lastInsertRowid ?? 0),
        changes: res.rowsAffected,
      };
    },
  };
}

export const db = {
  prepare,
  get raw(): Client {
    return getClient();
  },
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
