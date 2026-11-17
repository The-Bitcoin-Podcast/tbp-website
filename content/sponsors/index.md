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
rates: {}

# Bundles shown under the placements. Example:
#   packages:
#     - name: Launch
#       price: "$2,000 / month"
#       summary: For a product launch or a conference push.
#       includes:
#         - Two episode sponsorships
#         - One newsletter issue
packages: []
---
