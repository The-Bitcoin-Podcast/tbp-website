import { JSX } from "preact"
import { NavLink } from "./types/landingPage"

export interface NavigationProps {
  links: NavLink[]
  currentSlug?: string
}

export function Navigation({ links, currentSlug }: NavigationProps): JSX.Element {
  return (
    <nav class="landing-nav" data-mobile-open="false">
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
          aria-expanded="false"
          class="mobile-nav-toggle"
        >
          ☰
        </button>
        <ul class="mobile-nav-menu">
          {links.map((link) => (
            <li key={link.url}>
              <a href={link.url}>{link.label}</a>
            </li>
          ))}
        </ul>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var btn = document.querySelector('.mobile-nav-toggle');
              var menu = document.querySelector('.mobile-nav-menu');
              if (btn && menu) {
                btn.addEventListener('click', function() {
                  var isOpen = menu.classList.toggle('open');
                  btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                  btn.textContent = isOpen ? '✕' : '☰';
                });
              }
            })();
          `,
        }}
      />
    </nav>
  )
}
