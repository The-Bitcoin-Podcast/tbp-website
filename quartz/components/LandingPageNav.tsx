import { JSX } from "preact"
import { useState } from "preact/hooks"
import { NavLink } from "./types/landingPage"

export interface NavigationProps {
  links: NavLink[]
  currentSlug?: string
}

export function Navigation({ links, currentSlug }: NavigationProps): JSX.Element {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav class="landing-nav">
      <ul class="desktop-nav">
        {links.map((link) => (
          <li key={link.url}>
            <a
              href={link.url}
              class={currentSlug === link.url ? "active" : ""}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <div class="mobile-nav">
        <button
          aria-label="Toggle menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          ☰
        </button>
        <ul class={mobileMenuOpen ? "open" : ""}>
          {links.map((link) => (
            <li key={link.url}>
              <a href={link.url}>{link.label}</a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
