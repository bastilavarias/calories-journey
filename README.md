# Calories Journey

A small, public, read-only personal progress journal. HTML, Tailwind CSS 4, and native JavaScript modules. No database, frontend framework, or third-party runtime dependencies. Tailwind is a development-only compiler; the generated styles.css is committed and served directly by GitHub Pages.

- **FOOD_TRACKER.md** is the only nutrition/weight source of truth. Keep its date headings and tables consistent.
- The dashboard calculates logged totals from meal rows, keeps unconfirmed items separate, and excludes items marked not consumed.
- Missing sleep, training, and alcohol data stay unrecorded. Historical weight milestones are not daily measurements.
- To update: edit the Markdown, commit and push to main. GitHub Pages will republish from main/root once enabled.
- Install development dependencies: `npm ci`.
- Build CSS after editing HTML, JavaScript classes, or `tailwind.css`: `npm run build:css`. Use `npm run dev:css` to watch changes. Commit the generated `styles.css` along with its source.
- Preview locally: `python3 -m http.server 8000`, then open http://localhost:8000. Do not open the HTML directly; fetch requires HTTP.
- Tests: `npm test`. Optional browser smoke test: `PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node browser.test.mjs`.

## GitHub Pages

Once authenticated with GitHub CLI:

```sh
gh auth login --hostname github.com --git-protocol ssh
gh api --method POST repos/bastilavarias/calories-journey/pages -f 'source[branch]=main' -f 'source[path]=/'
gh api repos/bastilavarias/calories-journey/pages --jq '.html_url'
```

If Pages already exists, update its source with PUT instead of POST, if needed.

The repository and published site are public by owner request. Never put access tokens or other credentials here.
