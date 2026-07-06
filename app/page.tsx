import { UrlInput } from "@/components/UrlInput";

export default function Home() {
  return (
    <main className="shell home-shell">
      <section className="hero">
        <p className="eyebrow">API Peek</p>
        <h1>Paste an API URL. Get readable JSON back.</h1>
        <p className="lede">Enter any public GET endpoint. The response opens at the same URL path, already fetched server-side.</p>
      </section>

      <UrlInput buttonLabel="Peek" />
    </main>
  );
}
