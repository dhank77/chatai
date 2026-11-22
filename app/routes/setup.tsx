import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import type { Route } from './+types/setup';
import { runSetupChecks } from '~/lib/setup-check';

export const meta: Route.MetaFunction = () => [
  { title: 'Cek Instalasi · ChatAI' },
  { name: 'robots', content: 'noindex' },
];

export async function loader({ request }: Route.LoaderArgs) {
  const force = new URL(request.url).searchParams.has('refresh');
  return runSetupChecks(force);
}

export default function Setup({ loaderData }: Route.ComponentProps) {
  const { ok, checks, checkedAt } = loaderData;
  const passed = checks.filter((c) => c.ok).length;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Cek instalasi</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Halaman ini memeriksa konfigurasi server. Tidak ada nilai rahasia yang ditampilkan.
        </p>

        <div
          className={`mt-6 rounded-lg border px-4 py-3 text-sm font-medium ${
            ok
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300'
              : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200'
          }`}
        >
          {ok
            ? 'Semua siap. Silakan daftar akun lalu buka dashboard.'
            : `${passed} dari ${checks.length} pemeriksaan lolos. Perbaiki yang merah, lalu muat ulang halaman ini.`}
        </div>

        <ul className="mt-6 divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          {checks.map((c) => (
            <li key={c.id} className="flex gap-3 px-4 py-3">
              {c.ok ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-label="Lolos" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-label="Gagal" />
              )}
              <div className="min-w-0">
                <p className="font-medium">{c.label}</p>
                <p className="break-words text-sm text-gray-600 dark:text-gray-400">{c.detail}</p>
                {c.hint && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{c.hint}</p>}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
          <span>Diperiksa {new Date(checkedAt).toLocaleString('id-ID')}</span>
          <div className="flex gap-2">
            <a
              href="?refresh"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4" /> Periksa ulang
            </a>
            {ok && (
              <a href="/register" className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700">
                Daftar akun
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
