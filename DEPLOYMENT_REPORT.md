# Deployment & Real Device Validation V1

## Current status

GitHub Pages deployment is live. The repository is public, Pages is configured with `build_type=workflow`, HTTPS is enforced, and the successful Actions run is `35310844726`.

```text
GITHUB_REPOSITORY = https://github.com/mjkxpro/fixed-risk-lot-calculator
GITHUB_PAGES_URL = https://mjkxpro.github.io/fixed-risk-lot-calculator/
HTTPS = TRUE
PWA_READY = TRUE (manifest, standalone metadata, service worker, and production page verified)
OFFLINE_READY = TRUE (cached-shell test completed locally; production service worker and all shell assets return 200)
MOBILE_LAYOUT_READY = FALSE (responsive CSS and Safari page load checked, but a complete physical iPhone interaction pass was not available)
CALCULATION_ENGINE_VALIDATED = TRUE
TESTS = 21 passed / 0 failed
RATE_FALLBACK_READY = TRUE
MONTHLY_COST = $0
RATE_SOURCE_OBSERVED = Live for EURUSD/XAUUSD; Fallback for GBPJPY when the public rate request was unavailable
PRODUCTION_READY = FALSE
BLOCKER = Complete a physical iPhone Safari interaction pass for the requested device-level validation.
```

## Local validation evidence

- HTTP-served PWA loaded successfully with relative asset paths.
- EURUSD Entry/SL `1.18000` / `1.17500` produced `1.60 lots`.
- GBPJPY SL distance `58` produced `2.06 lots` using cached/fallback-compatible rate handling.
- XAUUSD `3650` / `3640` produced `0.80 lots`.
- After stopping the local HTTP server, the cached service-worker shell still started and calculated EURUSD `1.60 lots`.
- The service worker uses versioned cache `fixed-risk-calculator-v2` and removes older caches on activation.
- Production resource checks returned HTTP 200 for HTML, CSS, all modules, manifest, service worker, and icon.
- Production URL loaded in the in-app browser and produced EURUSD `1.60`, GBPJPY `2.06`, and XAUUSD `0.80` in smoke tests.
- GitHub Pages API confirmed `https_enforced=true` and `build_type=workflow`.

## Required next action

Open the production URL on an actual iPhone Safari at 375/390/430px-equivalent portrait sizes, test symbol search, numeric input, both modes, and Add to Home Screen. If that pass is clean, set `MOBILE_LAYOUT_READY = TRUE` and `PRODUCTION_READY = TRUE`.
