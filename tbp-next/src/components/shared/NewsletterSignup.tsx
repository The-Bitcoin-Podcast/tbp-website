/**
 * Weekly newsletter signup.
 *
 * The site is static, so the form posts straight to the email service.
 * Configure it in .env.local (see .env.example):
 *
 *   NEXT_PUBLIC_NEWSLETTER_FORM_ACTION  the service's form POST URL
 *   NEXT_PUBLIC_NEWSLETTER_EMAIL_FIELD  the email field name it expects (default "email")
 *
 * Until the action URL is set, the form is shown disabled so no address is
 * ever collected and then dropped.
 */
const FORM_ACTION = process.env.NEXT_PUBLIC_NEWSLETTER_FORM_ACTION ?? "";
const EMAIL_FIELD = process.env.NEXT_PUBLIC_NEWSLETTER_EMAIL_FIELD || "email";

interface NewsletterSignupProps {
  /** "band" is the full-width black strip on the homepage; "card" sits inside a page column. */
  variant?: "card" | "band";
}

export function NewsletterSignup({ variant = "card" }: NewsletterSignupProps) {
  const ready = FORM_ACTION.length > 0;
  const band = variant === "band";
  const note = ready ? "Free. Unsubscribe any time." : "Signups open soon.";

  const form = (
    <form
      action={ready ? FORM_ACTION : undefined}
      method="post"
      target="_blank"
      className={`flex flex-col gap-3 sm:flex-row ${band ? "" : "mx-auto mt-6 max-w-md"}`}
    >
      <input
        aria-label="Email address"
        type="email"
        name={EMAIL_FIELD}
        required
        disabled={!ready}
        autoComplete="email"
        placeholder="you@example.com"
        className={`min-w-0 flex-1 rounded-full bg-background px-[22px] py-4 text-base text-foreground placeholder:text-muted disabled:opacity-60 ${
          band ? "border-0" : "border border-border"
        }`}
      />
      <button
        type="submit"
        disabled={!ready}
        className="rounded-full bg-brand px-7 py-4 text-base font-semibold text-foreground transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-brand"
      >
        Subscribe
      </button>
    </form>
  );

  if (band) {
    return (
      <section aria-labelledby="newsletter-heading" className="bg-foreground py-16 text-background">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-8 px-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 lg:flex-1">
            <h2 id="newsletter-heading" className="font-display text-3xl font-extrabold sm:text-[34px]">
              Fergulati Finds, every week
            </h2>
            <p className="mt-2 text-base leading-relaxed text-[#b8b8b4]">
              One email on Bitcoin, markets, regulation and DeFi.
            </p>
          </div>
          <div className="min-w-0 lg:flex-1">
            {form}
            <p className="mt-3 text-[13px] text-[#b8b8b4]">{note}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="rounded-2xl bg-surface-light p-6 text-center sm:p-8"
    >
      <h2 id="newsletter-heading" className="font-display text-2xl font-extrabold sm:text-3xl">
        Fergulati Finds, every week
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-muted">
        One email on Bitcoin, markets, regulation and DeFi.
      </p>
      {form}
      <p className="mt-3 text-[13px] text-muted">{note}</p>
    </section>
  );
}
