# Unreleased Notes

#
# (automatisch geleert nach Release)

## 2025-10-13

### Security

### Docs

- Replace mastodon-api with fetch client; remove vulnerable transitive deps (request/form-data/tough-cookie); audit: 0 vulns; smoke scripts load module-alias
- README + .env.sample: SSE als primäre Live-Update-Quelle, Polling nur Fallback; ENV-Prioritäten und neue Polling-Defaults dokumentiert (active 30s, idle 2m, hidden 5m, jitter 0.2).