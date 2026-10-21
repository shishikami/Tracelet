# Tracelet SEO keyword audit — 2026-10-20

This audit is a baseline, not a ranking promise. Search results vary by location, language, history and crawl timing. Record future checks with the same queries and a signed-out browser where possible.

## Current visibility

| Surface | Check | Result | Interpretation |
| --- | --- | --- | --- |
| Google Search Console | Performance, last three months | No query, impression or click data; the report says data is still processing and asks to check again after about one day. | The property is too new for a ranking conclusion. |
| Google Search Console | Page indexing | Still processing; no indexed/not-indexed breakdown yet. | Wait for processing before diagnosing exclusions. |
| Bing | `site:tracelet-opal.vercel.app` | No result shown. | Bing has not visibly indexed the Vercel domain yet. |
| Public web search | `"Tracelet" "tracelet-browser"` and `"Tracelet" browser analytics SDK` | Tracelet projects for AI security, Flutter geolocation, ML tooling and agent observability appeared; this project did not. | The short brand name is ambiguous and needs the stable qualifier “Tracelet Browser” plus the exact package name. |
| Public web search | Chinese and English generic queries for a TypeScript/browser analytics SDK with privacy or an offline queue | Competing SDKs and older technical content appeared; Tracelet did not. | Broad terms have competition; start with specific long-tail pages and earn external references. |

## Target query map

| Search intent | Primary page | Supporting proof |
| --- | --- | --- |
| `Tracelet Browser`, `tracelet-browser` | `/` and `/en` | Exact npm install command, GitHub and npm identity links, `SoftwareApplication` JSON-LD. |
| `TypeScript 前端埋点 SDK` | `/guides/typescript-browser-analytics-sdk` | Visible evaluation criteria, setup code, production checklist and FAQ. |
| `TypeScript browser analytics SDK` | `/en/guides/typescript-browser-analytics-sdk` | English equivalent with the same visible content and localized canonical URL. |
| `后端无关 浏览器埋点 SDK` | `/guides/backend-agnostic-analytics-sdk` | Architecture contracts, durable delivery, consent and codec boundaries. |
| `backend-agnostic browser analytics SDK` | `/en/guides/backend-agnostic-analytics-sdk` | English architecture article and implementation checklist. |
| `tracelet-browser npm` | npm package and GitHub README | Exact package name, install command and reciprocal canonical links. |

## Changes made from this audit

1. Use “Tracelet Browser” and `tracelet-browser` together in the homepage title, visible hero copy and structured data to disambiguate the brand.
2. Publish bilingual long-tail guides for TypeScript frontend/browser analytics SDK evaluation and implementation.
3. Put a concise, semantically structured page summary and internal links in the initial HTML response. The React app replaces this equivalent fallback after loading; it is not bot-specific content.
4. Add `TechArticle` and `BreadcrumbList` JSON-LD to guide routes while retaining the site-level `SoftwareApplication` entity.
5. Add the new localized URLs to the sitemap, AI-readable documentation, internal search, homepage and GitHub README.
6. Keep `meta keywords` out of the site. Google explicitly ignores that tag; target terms belong in useful visible content, titles and links.

## Recheck schedule

- **After deployment:** fetch the new guide URLs, confirm `200`, canonical, `hreflang`, structured data and initial HTML content, then resubmit the sitemap once.
- **After 24–72 hours:** read Search Console indexing and URL Inspection for the homepage plus the two guide URLs.
- **After 7 complete days:** record impressions, clicks, top queries and landing pages. Do not compare a partial day with the existing baseline.
- **After 28 days:** decide whether to add another guide based on real impressions. Prefer queries already receiving impressions over guessed high-volume keywords.

## 2026-10-21 checkpoint

- Search Console reports that `/sitemap.xml` was processed successfully and now discovers all **14** submitted URLs, matching the current sitemap exactly.
- The Performance and Page indexing reports are still processing, so there is not yet enough first-party data to diagnose ranking or indexing exclusions.
- Public searches for the exact brand/package and the Chinese long-tail query `TypeScript 浏览器埋点 SDK` still do not surface this project. Results are dominated by older npm packages and unrelated projects also named Tracelet.
- Keep the current brand qualifier (`Tracelet Browser`) and package name (`tracelet-browser`) stable. Do not rewrite titles again before Search Console has completed its first crawl and produced at least seven complete days of data.
- The next useful action is URL Inspection for the homepage and the two TypeScript SDK guides after Search Console finishes processing; broad content expansion before then would be guesswork.

## References

- Google Search Central: [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- Google Search Central: [SoftwareApplication structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- Google Search Central: [Google does not use the keywords meta tag](https://developers.google.com/search/blog/2009/09/google-does-not-use-keywords-meta-tag)
