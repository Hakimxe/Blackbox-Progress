import { db } from "./db";
import { slugify } from "./utils";

declare global {
  // eslint-disable-next-line no-var
  var __seedDone: boolean | undefined;
}

type SeedMember = {
  name: string;
  role: string;
  priority: string;
  tasks: string[];
  questions: { label: string; type: "number" | "text" | "yes_no" }[];
};

const SEED: SeedMember[] = [
  {
    name: "Maria",
    role: "Operations & Networking",
    priority:
      "Keep the team organized, ensure tasks are completed, and maximize valuable connections before and during the event.",
    tasks: [
      "Chase pending task completions across the team",
      "Add today's new event contacts to the list",
      "Send connection requests to today's target list (LinkedIn / event app)",
      "Flag any blockers or risks to leadership",
      "Plan tomorrow's outreach targets",
    ],
    questions: [
      { label: "What did you work on today?", type: "text" },
      { label: "How many team members did you follow up with today?", type: "number" },
      { label: "How many new event contacts were added today?", type: "number" },
      { label: "What is the biggest task or project currently being tracked?", type: "text" },
      { label: "What is the biggest blocker or risk right now?", type: "text" },
    ],
  },
  {
    name: "Theresa",
    role: "Hiring",
    priority:
      "Build a strong pipeline of high-quality editors and motion designers and get the best candidates onboarded as quickly as possible.",
    tasks: [
      "Reach out to 50 editors / graphics today",
      "Follow up with all warm candidates",
      "Send contracts to candidates ready to start",
      "Check with the team on profiles to validate",
      "Update the candidate pipeline / status sheet",
    ],
    questions: [
      { label: "What did you work on today?", type: "text" },
      { label: "How many candidates did you contact today?", type: "number" },
      { label: "How many are potential Editors/Graphics?", type: "number" },
      { label: "How many candidates started working?", type: "number" },
      { label: "What is the current hiring status?", type: "text" },
    ],
  },
  {
    name: "Riefqi",
    role: "Design",
    priority:
      "Deliver all Raise event designs on time and at a high standard, including booth assets, brochures, and post-event content.",
    tasks: [
      "Push the booth design forward one milestone",
      "Push the brochure design forward one milestone",
      "Deliver the day's requested assets / edits",
      "Share work-in-progress with the team for feedback",
      "Plan tomorrow's design priorities",
    ],
    questions: [
      { label: "What did you work on today?", type: "text" },
      { label: "How many designs/assets did you complete today?", type: "number" },
      { label: "What is the current status of the booth design?", type: "text" },
      { label: "What is the current status of the brochure design?", type: "text" },
      { label: "What design deliverable will be completed next?", type: "text" },
    ],
  },
  {
    name: "Vasile",
    role: "Sales",
    priority:
      "Generate qualified meetings and convert outreach efforts into real conversations and opportunities.",
    tasks: [
      "Send today's outbound email batch",
      "Make today's cold-call batch",
      "Follow up with leads waiting on a reply",
      "Add new leads & enrich existing ones in HubSpot",
      "Confirm tomorrow's scheduled meetings",
      "Send LinkedIn connection requests to today's target list",
    ],
    questions: [
      { label: "How many emails were sent today?", type: "number" },
      { label: "How many cold calls?", type: "number" },
      { label: "How many bookings were scheduled today?", type: "number" },
      { label: "How many new leads have been added?", type: "number" },
      { label: "How many LinkedIn connections?", type: "number" },
    ],
  },
  {
    name: "Vanessa",
    role: "Operations",
    priority:
      "Ensure all event logistics, suppliers, materials, for Raise and operational tasks are completed on time without delays.",
    tasks: [
      "Chase open supplier / vendor replies",
      "Confirm pending materials (goodies, brochures, tickets)",
      "Sync with Riefqi on design approvals",
      "Update the operations / logistics checklist",
      "Plan tomorrow's operational priorities",
    ],
    questions: [
      { label: "What did you work on today?", type: "text" },
      { label: "What progress was made on goodies, brochures, or tickets today?", type: "text" },
      { label: "How many suppliers, vendors, or partners did you follow up with today?", type: "number" },
      { label: "What is currently waiting for a response or approval?", type: "text" },
      { label: "What is the next operational task that needs to be completed?", type: "text" },
    ],
  },
  {
    name: "Hakim",
    role: "Content & Video Lead",
    priority:
      "Ensure the highest-quality videos are being produced by creators, editors, and motion designers while keeping all critical projects moving forward on time.",
    tasks: [
      "Review today's editor outputs and give feedback",
      "Sync with motion designers on active projects",
      "Push the top 3 priority videos forward one milestone",
      "Assign new content ideas to creators",
      "Plan tomorrow's review priorities",
    ],
    questions: [
      { label: "What did you work on today?", type: "text" },
      { label: "Did you follow up with creators, gave feedback and assign content ideas today?", type: "yes_no" },
      { label: "What is the current status of the team's active video projects?", type: "text" },
      { label: "What are videos are in the progress of making as of today?", type: "text" },
      { label: "What are the top 3 video projects currently being prioritized, and what is their status?", type: "text" },
    ],
  },
];

export async function runSeedIfNeeded(): Promise<void> {
  if (global.__seedDone) return;
  await db.ensureSchema();

  const existing = await db
    .prepare<{ c: number }>(`SELECT COUNT(*) as c FROM members`)
    .get();
  if (existing && Number(existing.c) > 0) {
    global.__seedDone = true;
    return;
  }

  for (const m of SEED) {
    const slug = slugify(m.name);
    const ins = await db
      .prepare(
        `INSERT INTO members (name, role, slug, status, priority) VALUES (?, ?, ?, 'active', ?)`
      )
      .run(m.name, m.role, slug, m.priority);
    const memberId = ins.lastInsertRowid;

    let prio = m.tasks.length;
    for (const title of m.tasks) {
      await db
        .prepare(
          `INSERT INTO tasks (member_id, title, status, priority) VALUES (?, ?, 'todo', ?)`
        )
        .run(memberId, title, prio--);
    }

    let pos = 0;
    for (const q of m.questions) {
      await db
        .prepare(
          `INSERT INTO questions (member_id, label, type, position, active) VALUES (?, ?, ?, ?, 1)`
        )
        .run(memberId, q.label, q.type, pos++);
    }
  }

  global.__seedDone = true;
}
