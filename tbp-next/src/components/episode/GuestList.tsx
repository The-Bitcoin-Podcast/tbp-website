import type { Guest } from "@/lib/types";

interface GuestListProps {
  guests: Guest[];
}

export function GuestList({ guests }: GuestListProps) {
  if (!guests || guests.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
        Guests
      </h3>
      <div className="flex flex-wrap gap-3">
        {guests.map((guest) => (
          <div
            key={guest.name}
            className="card flex items-center gap-3 px-4 py-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent text-sm font-bold">
              {guest.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold">{guest.name}</p>
              <div className="flex gap-2">
                {guest.twitter && (
                  <a
                    href={
                      guest.twitter.startsWith("http")
                        ? guest.twitter
                        : `https://twitter.com/${guest.twitter.replace("@", "")}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted hover:text-accent transition-colors"
                  >
                    Twitter
                  </a>
                )}
                {guest.linkedin && (
                  <a
                    href={guest.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted hover:text-accent transition-colors"
                  >
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
