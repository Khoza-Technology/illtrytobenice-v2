# I'll Try To Be Nice

Our family recipe box, rebuilt as a fast, dependency-free static site with light and dark themes, built mobile first.

**Live:** https://khoza-technology.github.io/illtrytobenice-v2/

## Features
- 113 recipes migrated from the old WordPress site (khoza.com/recipes)
- Instant search across titles, ingredients, contributors and categories
- Browse by category or contributor
- Serving scaler, ingredient checkboxes, distraction-free cook mode (keeps the screen awake)
- Favorites
- Shopping list grouped by recipe, with a Combine view that merges like ingredients; send it to Google Keep (share sheet on phones, copy + open Keep on desktop)
- Print-friendly recipe pages
- Read-only JSON API at `/api/` (`recipes.json`, `recipes/<slug>.json`, `categories.json`, `contributors.json`, `index.json`)

## Develop
Requires Node 20+. No install step — there are no dependencies.

```sh
npm run dev     # build and serve at http://localhost:4173/illtrytobenice-v2/
npm run build   # output to dist/
npm run scrape  # re-import from the WordPress REST API into data/
```

Pushing to `main` builds and deploys with GitHub Actions. In the repo settings, set **Pages → Source** to **GitHub Actions**.

To move to a custom domain, set `basePath` to `/` and `siteUrl` in `site.config.json`, and add `src/CNAME`.

See [AGENTS.md](AGENTS.md) for contribution rules and [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) for the design system.
