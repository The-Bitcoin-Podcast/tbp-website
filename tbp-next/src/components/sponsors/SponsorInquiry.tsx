import { PLACEMENTS } from "@/lib/sponsors";

interface SponsorInquiryProps {
  /** POST URL of a hosted form. The site is static, so the form posts straight to it. */
  formAction?: string;
  contactEmail?: string;
  discordUrl: string;
}

const fieldClass =
  "w-full rounded-xl border-0 bg-background px-4 py-3 text-base text-foreground placeholder:text-muted";
const labelClass = "mb-1.5 block text-sm font-semibold";
const buttonClass =
  "inline-block rounded-full bg-brand px-7 py-4 text-base font-semibold text-foreground transition-colors hover:bg-brand-hover";

/**
 * How a sponsor gets in touch. Uses the best route that is configured in
 * content/sponsors/index.md: the inquiry form, then email, then Discord, so
 * the page never ends in a dead end.
 */
export function SponsorInquiry({ formAction, contactEmail, discordUrl }: SponsorInquiryProps) {
  if (formAction) {
    return (
      <form action={formAction} method="post" className="grid gap-5 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Your name</span>
          <input name="name" required autoComplete="name" className={fieldClass} />
        </label>
        <label>
          <span className={labelClass}>Company</span>
          <input name="company" required autoComplete="organization" className={fieldClass} />
        </label>
        <label>
          <span className={labelClass}>Work email</span>
          <input name="email" type="email" required autoComplete="email" className={fieldClass} />
        </label>
        <label>
          <span className={labelClass}>Website</span>
          <input name="website" type="url" placeholder="https://" className={fieldClass} />
        </label>
        <fieldset className="sm:col-span-2">
          <legend className={labelClass}>What are you interested in?</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2.5">
            {PLACEMENTS.map((placement) => (
              <label key={placement.id} className="flex items-center gap-2 text-[15px]">
                <input
                  type="checkbox"
                  name="placements"
                  value={placement.name}
                  className="h-4 w-4 accent-[#f7931a]"
                />
                {placement.name}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="sm:col-span-2">
          <span className={labelClass}>What would you like to promote, and when?</span>
          <textarea name="message" rows={4} required className={fieldClass} />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className={buttonClass} data-sponsor-event="sponsor_inquiry" data-sponsor-slot="form">
            Send inquiry
          </button>
        </div>
      </form>
    );
  }

  if (contactEmail) {
    return (
      <div>
        <a
          href={`mailto:${contactEmail}?subject=${encodeURIComponent("Sponsoring The Bitcoin Podcast Network")}`}
          className={buttonClass}
          data-sponsor-event="sponsor_inquiry"
          data-sponsor-slot="email"
        >
          Email {contactEmail}
        </a>
        <p className="mt-4 text-[15px] leading-relaxed text-[#b8b8b4]">
          Tell us what you&rsquo;d like to promote, which placements interest you and your timing.
        </p>
      </div>
    );
  }

  return (
    <div>
      <a
        href={discordUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
        data-sponsor-event="sponsor_inquiry"
        data-sponsor-slot="discord"
      >
        Message us on Discord
      </a>
      <p className="mt-4 text-[15px] leading-relaxed text-[#b8b8b4]">
        Join the server and message the hosts with what you&rsquo;d like to promote, which
        placements interest you and your timing.
      </p>
    </div>
  );
}
