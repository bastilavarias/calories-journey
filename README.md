# Calories Journey

A small, public, read-only personal progress journal. No database, framework, or build step. HTML, local CSS, and native JavaScript modules only; no third-party runtime dependencies.

- **FOOD_TRACKER.md** is the only nutrition/weight source of truth. Keep its date headings and tables consistent.
- The dashboard calculates logged totals from meal rows, keeps unconfirmed items separate, and excludes items marked not consumed.
- Missing sleep, training, and alcohol data stay unrecorded. Historical weight milestones are not daily measurements.
- To update: edit the Markdown, commit and push to main. GitHub Pages will republish from main/root once enabled.
- Preview locally: `python3 -m http.server 8000`, then open http://localhost:8000. Do not open the HTML directly; fetch requires HTTP.
- Tests: `node --test journal.test.mjs`.

## GitHub Pages

Once authenticated with GitHub CLI:

```sh
gh auth login --hostname github.com --git-protocol ssh
gh api --method POST repos/bastilavarias/calories-journey/pages -f 'source[branch]=main' -f 'source[path]=/'
gh api repos/bastilavarias/calories-journey/pages --jq '.html_url'
```

If Pages already exists, update its source with PUT instead of POST, if needed.

The repository and published site are public by owner request. Never put access tokens or other credentials here.
