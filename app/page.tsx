import { UrlInput } from "@/components/UrlInput";

export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">API Peek</p>
        <h1>Paste an API URL. Get readable JSON back.</h1>
        <p className="lede">Minimal scaffold for the GET-only proxy, JSON viewer, and code snippet flow.</p>
      </section>

      <UrlInput />
    </main>
  );
}
