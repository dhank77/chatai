import { runSetupChecks } from '~/lib/setup-check';

// GET /api/health — machine-readable version of /setup (200 when everything is ready, 503 otherwise)
export async function loader() {
  const report = await runSetupChecks();
  return Response.json(
    { ok: report.ok, checkedAt: report.checkedAt, checks: report.checks.map(({ id, ok, detail }) => ({ id, ok, detail })) },
    { status: report.ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
