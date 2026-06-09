import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="mx-auto grid min-h-[68vh] max-w-3xl place-items-center px-4 py-16 text-center sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">404</p>
        <h1 className="mt-4 text-4xl font-black sm:text-6xl">That match is off the board.</h1>
        <p className="mt-4 text-slate-300">The page you are looking for does not exist.</p>
        <Link
          to="/"
          className="mt-8 inline-flex rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-white"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
