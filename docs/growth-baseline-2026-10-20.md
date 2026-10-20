# Tracelet growth baseline — 2026-10-20

This snapshot records the first comparable growth baseline before the public community launch. It is intentionally conservative: automated installs, CI traffic and maintainer activity are not treated as product adoption.

## Snapshot

| Source | Window | Baseline | Interpretation |
| --- | --- | --- | --- |
| Vercel Web Analytics | Since analytics was enabled (`2026-10-16` through `2026-10-20`) | 2 visitors, 15 pageviews | Early maintainer/review traffic; not yet a launch baseline. |
| npm downloads | Last complete npm week (`2026-10-12`–`2026-10-18`) | 492 downloads | Includes CI and automated dependency installs. Do not equate downloads with developers. |
| GitHub clones | Last available 14-day report (`2026-10-05`–`2026-10-18`) | 191 clones, 88 unique cloners | Repository was created on `2026-10-16`; setup, CI and automated checkouts can inflate this number. |
| GitHub visitors | Same GitHub report | 0 views, 0 unique visitors | GitHub notes that traffic tables can take several days to appear. |
| GitHub repository | Read on `2026-10-20` | 0 stars, 0 forks, 0 open issues | Discussions is enabled; the welcome post has not been published yet. |
| Google Search Console | Read on `2026-10-20` | No query, impression or click data yet | Search Console reports that data is still processing and asks to check again after about one day. |
| Google sitemap | Last read `2026-10-20` | Successfully processed; 2 pages discovered | Production `sitemap.xml` currently contains 12 URLs, so wait for the next crawl before diagnosing or resubmitting. |

## Vercel page distribution

The 15 measured pageviews were distributed as follows:

| Path | Pageviews |
| --- | ---: |
| `/` | 6 |
| `/playground` | 3 |
| `/examples` | 2 |
| `/quickstart` | 1 |
| `/reference` | 1 |
| `/en/reference` | 1 |
| `/guides/backend-agnostic-analytics-sdk` | 1 |

All 15 pageviews currently have an empty referrer. UTM breakdowns are not available on the current Vercel plan; querying the `utmSource` dimension requires Web Analytics Plus or Enterprise. This is not a reason to upgrade before public traffic exists. Keep the UTM parameters in launch links so the data is ready if the reporting capability is enabled later.

## GitHub clone distribution

GitHub's available clone report ends on `2026-10-18`:

| Date | Clones | Unique cloners |
| --- | ---: | ---: |
| `2026-10-16` | 102 | 46 |
| `2026-10-17` | 64 | 34 |
| `2026-10-18` | 25 | 12 |

The daily unique values are not additive, so they do not need to sum to the 14-day unique total.

## Next comparison

Record the next snapshot after seven complete days of public distribution, using the same windows and definitions:

1. Search Console impressions, clicks, CTR and top landing queries.
2. Vercel visitors, pageviews, top paths and referrers.
3. Playground, Quickstart and starter traffic relative to homepage traffic.
4. npm last-complete-week downloads.
5. GitHub stars, visitors, clones, issues and discussions.
6. The most common integration question and one experiment for the following week.

Do not compare partial-day numbers with complete weeks. Annotate launch dates, CI changes and unusual automated traffic before drawing conclusions.
