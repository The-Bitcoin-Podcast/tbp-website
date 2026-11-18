---
title: Sponsors

# Settings for the "Sponsor the network" page at /sponsors/partner.
# Everything below is optional: anything left empty is left off the page.

# To put a sponsor on the site, add `placements` to that sponsor's own file in
# this folder (not here). Example, in Logos.md:
#   placements:
#     - slot: show          # network, show, episode, newsletter, reports, section or archive
#       target: hio         # show folder, episode file, issue file, or search / people / business-tips
#       start: 2026-12-01   # optional
#       end: 2027-02-28     # optional, shown through this day
#       message: "Optional line shown beside the name."
# Dates take effect at the next deploy. Full notes: tbp-next/src/lib/sponsors.ts.

# Where sponsor inquiries go.
#   inquiryFormAction: the POST URL of a hosted form (Formspree, Tally, Basin...).
#                      When set, the page shows the full inquiry form.
#   contactEmail:      shown as an "Email us" button when there is no form.
# With neither set, the page sends people to Discord.
inquiryFormAction: ""
contactEmail: ""

# Audience numbers shown at the top of the page. Example:
#   audience:
#     - value: "25k"
#       label: monthly downloads
#     - value: "12k"
#       label: YouTube subscribers
audience: []

# Starting prices, shown on each placement as written. Placements without one
# say "Rates on request". Keys: network, show, episode, newsletter, reports,
# section, archive. Example:
#   rates:
#     episode: "From $500 per episode"
rates:
  network: "From $500 per month"
  show: "From $300 per month"
  episode: "From $250 per episode"
  newsletter: "From $200 per issue"
  reports: "From $750 per report"
  section: "From $200 per month"
  archive: "From $1,000 per year"

# Self-serve booking. Give a placement the link to a hosted payment or booking
# page (a Stripe Payment Link, a Calendly page...) and it gets a "Book now"
# button. Links must start with https://. Same keys as rates. Example:
#   booking:
#     episode: "https://buy.stripe.com/your-link"
booking: {}

# Bundles shown under the placements. `bookingUrl` is optional and adds a
# "Book now" button to that package. Example:
#   packages:
#     - name: Launch
#       price: "$2,000 / month"
#       summary: For a product launch or a conference push.
#       includes:
#         - Two episode sponsorships
#         - One newsletter issue
#       bookingUrl: "https://buy.stripe.com/your-link"
packages:
  - name: Launch
    price: "About $1,000 per month"
    summary: For a product launch or a conference push.
    includes:
      - Two episode sponsorships
      - One newsletter issue
      - One section of the site
  - name: Show partner
    price: "About $2,500 per month"
    summary: Your name on one show, on the page and in the episodes.
    includes:
      - One show sponsorship
      - Four episode sponsorships
      - Two newsletter issues
  - name: Network partner
    price: "About $5,000 per month"
    summary: Everywhere the network reaches.
    includes:
      - Network sponsorship across the site
      - Eight episode sponsorships
      - Every newsletter issue
      - One report

# Reporting: sponsor views and clicks go to Google Analytics. See
# "Sponsors" in tbp-next/README.md for the events and how to report on them.
---
