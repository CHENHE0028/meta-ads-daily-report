# Meta Ads Daily Report

Two separate public, read-only daily performance reports:

- `jinmai/`: Jinmai only
- `cus/`: CUS only

## Files

- `assets/`: shared report UI
- `jinmai/report.json`: Jinmai daily generated data
- `cus/report.json`: CUS daily generated data

The published page must never contain Meta access tokens, request headers, lead-form submissions, customer PII, account change logs, or operator identities.

The 09:00 Asia/Shanghai automation updates both account-specific JSON files, validates them, commits the changes, and publishes them through GitHub Pages. Configuration-change alerts remain in the private OpenClaw conversation and are not added to either public report.
