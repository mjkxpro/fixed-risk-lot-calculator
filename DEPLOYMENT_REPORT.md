# Deployment & Real Device Validation V1

## Current status

The project is ready for GitHub Pages deployment, but the first push is waiting for the GitHub OAuth token to receive the `workflow` scope. GitHub created the repository but rejected uploading `.github/workflows/deploy-pages.yml` until that scope is granted.

```text
GITHUB_REPOSITORY = https://github.com/mjkxpro/fixed-risk-lot-calculator
GITHUB_PAGES_URL = PENDING_FIRST_PUSH
HTTPS = PENDING
PWA_READY = LOCALLY_VERIFIED
OFFLINE_READY = TRUE (local cached-shell test)
MOBILE_LAYOUT_READY = LOCAL RESPONSIVE CSS REVIEW + HTTP SMOKE TEST
CALCULATION_ENGINE_VALIDATED = TRUE
TESTS = 21 passed / 0 failed
RATE_FALLBACK_READY = TRUE
MONTHLY_COST = $0
PRODUCTION_READY = FALSE
BLOCKER = GitHub OAuth token needs workflow scope before the Actions workflow can be pushed.
```

## Local validation evidence

- HTTP-served PWA loaded successfully with relative asset paths.
- EURUSD Entry/SL `1.18000` / `1.17500` produced `1.60 lots`.
- GBPJPY SL distance `58` produced `2.06 lots` using cached/fallback-compatible rate handling.
- XAUUSD `3650` / `3640` produced `0.80 lots`.
- After stopping the local HTTP server, the cached service-worker shell still started and calculated EURUSD `1.60 lots`.
- The service worker uses versioned cache `fixed-risk-calculator-v2` and removes older caches on activation.

## Required next action

Complete the GitHub device authorization started by `gh auth refresh -h github.com -s workflow`, then push `main`. After that, verify the Actions run, Pages HTTPS URL, deployed asset status codes, and update this report to the final production state.
