<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { groupByProblem, PROBLEMS, sharedSubjects } from '#lib/kb/problems';

  let { ticket }: { ticket: number } = $props();

  const result = $derived(groupByProblem(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const shared = $derived(sharedSubjects(result.groups));
  const channels = (c: Record<string, number>) =>
    Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .map(([ch, n]) => `${ch} ×${n}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{result.merged.length}</strong> reports merged into #{ticket}
  ({result.exportRows} rows in the export; repeated ids counted once) ·
  <strong>{result.groups.length}</strong>
  {result.groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>ways in</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each result.groups as g (g.problem)}
      <tr>
        <td>
          <code>{g.problem}</code>
          {#if g.problem !== 'unplaced'}<br /><span class="what">{PROBLEMS[g.problem].title}</span>{/if}
        </td>
        <td>{g.reports.length}</td>
        <td>{g.tenants.length}</td>
        <td class="small">{channels(g.channels)}</td>
        <td class="small">{g.firstSeen} → {g.lastSeen}</td>
        <td>
          {#if g.problem !== 'unplaced'}<a href={PROBLEMS[g.problem].ticket}>#{PROBLEMS[g.problem].ticket.split('/').pop()}</a>{:else}none{/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

{#each result.groups as g (g.problem)}
  <h3><code>{g.problem}</code> · {g.reports.length} reports</h3>
  {#if g.problem !== 'unplaced'}<p>{PROBLEMS[g.problem].what}</p>{/if}
  <p class="small">
    Tenants: {g.tenants.join(', ')}.
    {g.mistagged} of {g.reports.length} carry a different intake tag.
  </p>
  {#if g.reports.length <= 40}
    <details>
      <summary>report ids</summary>
      <p class="ids">{g.reports.map((r) => r.id).sort().join(' ')}</p>
    </details>
  {/if}
{/each}

<p class="small">
  {shared.length} subject lines turn up under more than one problem, so matching on the subject
  line cannot keep them apart: {shared.map((s) => `“${s}”`).join(', ')}.
</p>

<style>
  .sum { font-size: 1.1rem; }
  .what { color: var(--muted); font-size: 0.85em; }
  .small { color: var(--muted); font-size: 0.85em; }
  .ids { font: 0.8rem var(--mono); }
  h3 { margin: 1.5rem 0 0.25rem; font-size: 1rem; }
</style>
