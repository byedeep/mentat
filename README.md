# API Peek

API Peek is a small Next.js app for previewing public API responses and turning GET requests into copyable code snippets.

Paste a public API URL, fetch it server-side, view the response as formatted JSON, copy the payload, or generate a request snippet for curl, Python, JavaScript, Go, PHP, Java, Rust, and more.

## Features

- URL-to-viewer routing: open `/api.example.com/users` or `/https://api.example.com/users` directly.
- Server-side fetching: result pages load with the response already populated.
- JSON viewer: formatted output, syntax highlighting, metadata, and copy-to-clipboard.
- Snippet generator: powered by `httpsnippet` for common HTTP clients.
- Programmatic proxy API: fetch targets with `/api/proxy?url=...`.
- Safety controls: GET-only requests, request timeout, SSRF guard, and per-IP rate limits.
- Vercel-ready rate limiting: uses Vercel KV when configured, with an in-memory fallback for local development.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Vercel KV
- HTTPSnippet

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`, then paste a public GET endpoint such as:

```text
https://api.github.com/repos/vercel/next.js
```

You can also open a target directly through the catch-all route:

```text
http://localhost:3000/https://api.github.com/repos/vercel/next.js
http://localhost:3000/api.github.com/repos/vercel/next.js
```

If no protocol is provided, API Peek probes HTTPS first and falls back to HTTP when HTTPS is not reachable.

## Environment Variables

Copy `.env.example` to `.env.local` for local development.

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `KV_REST_API_URL` | No in dev, yes for production KV | None | Vercel KV REST endpoint used for shared rate limits. |
| `KV_REST_API_TOKEN` | No in dev, yes for production KV | None | Vercel KV REST token. |
| `KV_URL` | No | None | Included for Vercel KV compatibility. |
| `KV_REST_API_READ_ONLY_TOKEN` | No | None | Included for Vercel KV compatibility. |
| `RATE_LIMIT_PROXY_PER_MINUTE` | No | `20` | Requests per minute for result pages and `/api/proxy`. |
| `RATE_LIMIT_SNIPPET_PER_MINUTE` | No | `60` | Requests per minute for `/api/snippet`. |

When `KV_REST_API_URL` and `KV_REST_API_TOKEN` are missing, rate limits use an in-memory store. That is fine for local development, but production deployments should use Vercel KV or another shared store.

## API Routes

### `GET /api/proxy`

Fetches a public HTTP or HTTPS target and returns the response with metadata.

```bash
curl "http://localhost:3000/api/proxy?url=https://api.github.com/repos/vercel/next.js"
```

Successful responses use this shape:

```json
{
  "meta": {
    "requestedUrl": "https://api.github.com/repos/vercel/next.js",
    "status": 200,
    "timeMs": 123,
    "contentType": "application/json; charset=utf-8",
    "rateLimit": {
      "limit": 20,
      "remaining": 19,
      "reset": 1751846400
    }
  },
  "data": {}
}
```

### `POST /api/snippet`

Generates a GET request snippet for a target URL.

```bash
curl "http://localhost:3000/api/snippet" \
  -H "content-type: application/json" \
  -d '{"url":"https://api.github.com/repos/vercel/next.js","language":"python"}'
```

Supported built-in language values include `curl`, `python`, `javascript`, `js`, `node`, `node:axios`, `go`, `php`, `java`, and `rust`. Other `httpsnippet` target/client pairs can be requested as `target:client` when supported by the library.

## Security Model

- Only `GET` requests are proxied.
- Only `http:` and `https:` targets are allowed.
- Requests time out after 10 seconds.
- Private, local, link-local, multicast, documentation, and other reserved IP ranges are blocked.
- Hostnames are resolved before fetches so DNS results can be checked against the blocklist.
- Rate-limit headers are returned when rate limiting is applied: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.

## Scripts

```bash
npm run dev      # Start the development server
npm run build    # Build for production
npm run start    # Start the production server
npm run lint     # Run ESLint
```

## Project Structure

```text
app/
  [...path]/page.tsx       Result page that fetches and renders the target response
  api/proxy/route.ts       Programmatic JSON proxy endpoint
  api/snippet/route.ts     Request snippet generation endpoint
  page.tsx                 Homepage URL input
components/
  JsonViewer.tsx           Formatted response viewer
  LanguageSelect.tsx       Snippet language picker
  UrlInput.tsx             Shared target URL form
lib/
  fetchTarget.ts           Shared fetch, timeout, parsing, and error logic
  rateLimit.ts             KV-backed rate limiter with memory fallback
  resolveProtocol.ts       HTTPS-first protocol resolution
  ssrfGuard.ts             Public-target validation
```

## Deploying

Deploy to Vercel like a standard Next.js app.

1. Create a Vercel project for this repository.
2. Add a Vercel KV database.
3. Expose the KV environment variables to the project.
4. Set `RATE_LIMIT_PROXY_PER_MINUTE` and `RATE_LIMIT_SNIPPET_PER_MINUTE` if the defaults are not appropriate.
5. Deploy and test direct catch-all routes, query strings, and snippet generation.

## Limitations

- Public GET endpoints only.
- No request body passthrough yet.
- No custom header or auth passthrough yet.
- Private networks and local services are intentionally blocked.

See `mentat.md` for the implementation notes and remaining roadmap items.
