# Lydra

Save useful content, find realistic time, and confirm reading blocks in Google Calendar.

Lydra is a free, local-first Manifest V3 extension. Saved links, notes, estimates, and
reading history stay in the browser. Lydra reads Calendar availability only after the user
connects Google, and it never creates an event without explicit confirmation.

## Development

Requirements: Node 24 and pnpm 11.

```sh
pnpm install
pnpm build
pnpm check
```

Load `dist/` from `chrome://extensions` with Developer mode enabled. Calendar features are
disabled until `LYDRA_GOOGLE_OAUTH_CLIENT_ID` is supplied during the build; see
[`docs/oauth.md`](docs/oauth.md).

## Privacy and permissions

Lydra has no backend, advertising, analytics, or remote executable code. See
[`PRIVACY.md`](PRIVACY.md) for data handling and [`docs/permissions.md`](docs/permissions.md)
for each requested browser permission.

## Attribution

Lydra is based in product direction on [Reading Block](https://github.com/zarazhangrui/reading-block)
by Zara Zhang, licensed under MIT. Lydra replaces automatic booking with ranked suggestions
and explicit confirmation.

## License

MIT. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).
