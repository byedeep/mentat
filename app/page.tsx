import { UrlInput } from "@/components/UrlInput";

export default function Home() {
  return (
    <main className="shell home-shell">
      <section className="hero">
        <p className="eyebrow">API Schema</p>
        <h1>Paste an API URL. Get a schema and structs.</h1>
        <p className="lede">Enter any public GET endpoint. The response is fetched server-side, converted into JSON Schema, then turned into language models.</p>
      </section>

      <UrlInput buttonLabel="Generate schema" />
    </main>
  );
}
