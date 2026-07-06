# API Schema

API Schema is a small Next.js app for turning public API responses into JSON Schema and copyable language models.

Paste a public API URL, fetch it server-side, infer a JSON Schema from the response payload, then generate TypeScript interfaces, Go structs, Rust structs, or Python dataclasses.

## Features

- URL-to-viewer routing: open `/api.example.com/users` or `/https://api.example.com/users` directly.
- Server-side fetching: result pages load with the response already populated.
- JSON Schema inference: converts the fetched response sample into a Draft 2020-12 schema.
- Model generator: emits TypeScript, Go, Rust, and Python data models from the inferred schema.
- Response viewer: formatted output, syntax highlighting, metadata, and copy-to-clipboard.
- Programmatic proxy API: fetch targets with `/api/proxy?url=...`.
- Programmatic schema API: fetch targets and generate schemas with `/api/schema?url=...`.
- Safety controls: GET-only requests, request timeout, SSRF guard, and per-IP rate limits.
- Vercel-ready rate limiting: uses Vercel KV when configured, with an in-memory fallback for local development.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Vercel KV

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

If no protocol is provided, API Schema probes HTTPS first and falls back to HTTP when HTTPS is not reachable.

## Environment Variables

Copy `.env.example` to `.env.local` for local development.

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `KV_REST_API_URL` | No in dev, yes for production KV | None | Vercel KV REST endpoint used for shared rate limits. |
| `KV_REST_API_TOKEN` | No in dev, yes for production KV | None | Vercel KV REST token. |
| `KV_URL` | No | None | Included for Vercel KV compatibility. |
| `KV_REST_API_READ_ONLY_TOKEN` | No | None | Included for Vercel KV compatibility. |
| `RATE_LIMIT_PROXY_PER_MINUTE` | No | `20` | Requests per minute for `/api/proxy`. |
| `RATE_LIMIT_SCHEMA_PER_MINUTE` | No | `20` | Requests per minute for result pages and `/api/schema`. |

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

### `GET /api/schema`

Fetches a public HTTP or HTTPS target and returns an inferred JSON Schema. Add `language` to include generated model code.

```bash
curl "http://localhost:3000/api/schema?url=https://api.github.com/repos/vercel/next.js&language=typescript"
```

Successful responses include `meta`, `schema`, and optional `code` fields. Supported language values include `typescript`, `ts`, `go`, `golang`, `rust`, `rs`, `python`, and `py`.

### `POST /api/schema`

Accepts the same inputs as JSON:

```bash
curl "http://localhost:3000/api/schema" \
  -H "content-type: application/json" \
  -d '{"url":"https://api.github.com/repos/vercel/next.js","language":"go"}'
```

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
  [...path]/page.tsx       Result page that fetches and renders schema/model output
  api/proxy/route.ts       Programmatic JSON proxy endpoint
  api/schema/route.ts      Schema and model generation endpoint
  page.tsx                 Homepage URL input
components/
  JsonViewer.tsx           Formatted response viewer
  SchemaGenerator.tsx      Schema viewer and model language picker
  UrlInput.tsx             Shared target URL form
lib/
  fetchTarget.ts           Shared fetch, timeout, parsing, and error logic
  rateLimit.ts             KV-backed rate limiter with memory fallback
  resolveProtocol.ts       HTTPS-first protocol resolution
  schema.ts                JSON Schema inference and model code generation
  ssrfGuard.ts             Public-target validation
```

## Deploying

Deploy to Vercel like a standard Next.js app.

1. Create a Vercel project for this repository.
2. Add a Vercel KV database.
3. Expose the KV environment variables to the project.
4. Set `RATE_LIMIT_PROXY_PER_MINUTE` and `RATE_LIMIT_SCHEMA_PER_MINUTE` if the defaults are not appropriate.
5. Deploy and test direct catch-all routes, query strings, and schema generation.

## Limitations

- Public GET endpoints only.
- Schemas are inferred from one response sample, so fields not present in that response cannot be discovered.
- No request body passthrough yet.
- No custom header or auth passthrough yet.
- Private networks and local services are intentionally blocked.

See `mentat.md` for the implementation notes and remaining roadmap items.
