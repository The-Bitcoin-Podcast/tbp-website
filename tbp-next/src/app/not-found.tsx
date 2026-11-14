import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="text-8xl font-display font-extrabold text-accent">404</span>
      <h1 className="mt-4 font-display text-3xl font-extrabold">
        Page Not Found
      </h1>
      <p className="mt-2 text-muted max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="rounded-xl bg-brand px-6 py-3 text-sm font-bold text-foreground transition-all hover:bg-brand-hover"
        >
          Go Home
        </Link>
        <Link
          href="/episodes"
          className="rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground transition-all hover:border-accent/50 hover:bg-surface-light"
        >
          Browse Episodes
        </Link>
      </div>
    </div>
  );
}
