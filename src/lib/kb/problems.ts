// One problem per bug, read from what each report says happened. causes.ts places a report by
// tenant and channel only; the desk's one-day-move list (desk-notes.json) names reports whose date
// moved by a day instead of trading day and month. No parser or form hint does that: it is its own bug.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'shift';

export const PROBLEMS: Record<Problem, { title: string; what: string; ticket: string }> = {
  parser: {
    title: 'Shared parser reads day-first dates month first',
    what: 'Day and month trade places for every day-first tenant, whatever the way in.',
    ticket: 'https://github.com/jakobos/support-kb-4471/issues/1',
  },
  hint: {
    title: 'booking-v3 form hint says MM/DD/YYYY to day-first tenants',
    what: 'People type what the hint shows, month first; the form reads it day first.',
    ticket: 'https://github.com/jakobos/support-kb-4471/issues/2',
  },
  shift: {
    title: 'Bookings move by one day',
    what: 'Day and month stay put; the booking lands one day off, and in one report two time zones got different days.',
    ticket: 'https://github.com/jakobos/support-kb-4471/issues/3',
  },
};

export function problemOf(r: Report, t: Tenant | undefined, shifted: readonly string[]): Problem | null {
  if (shifted.includes(r.id)) return 'shift';
  return causeOf(r, t);
}

export type ProblemGroup = {
  problem: Problem | 'unplaced';
  reports: Report[];
  tenants: string[];
  channels: Record<string, number>;
  // Reports intake tagged with a cause other than this group's.
  mistagged: number;
  firstSeen: string;
  lastSeen: string;
};

const ORDER: ProblemGroup['problem'][] = ['parser', 'hint', 'shift', 'unplaced'];

export function groupByProblem(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  shifted: readonly string[],
): { merged: Report[]; exportRows: number; groups: ProblemGroup[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const by = new Map<ProblemGroup['problem'], Report[]>();
  for (const r of merged) {
    const p = problemOf(r, tenantOf(r), shifted) ?? 'unplaced';
    by.set(p, [...(by.get(p) ?? []), r]);
  }
  const groups = ORDER.filter((p) => by.has(p)).map((problem) => {
    const rs = by.get(problem)!;
    const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
    return {
      problem,
      reports: rs,
      tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
      channels: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.channel]: (n[r.channel] ?? 0) + 1 }), {}),
      mistagged: rs.filter((r) => r.meta.intakeTag !== problem).length,
      firstSeen: days[0],
      lastSeen: days[days.length - 1],
    };
  });
  return { merged, exportRows: all.filter((r) => r.mergedInto === ticket).length, groups };
}

// Subject lines that turn up under more than one problem: matching on them (decision 0001)
// cannot keep these problems apart.
export function sharedSubjects(groups: ProblemGroup[]): string[] {
  const key = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  const seen = new Map<string, Set<ProblemGroup['problem']>>();
  for (const g of groups) for (const r of g.reports) seen.set(key(r.subject), (seen.get(key(r.subject)) ?? new Set()).add(g.problem));
  return [...seen.entries()].filter(([, ps]) => ps.size > 1).map(([s]) => s).sort();
}
