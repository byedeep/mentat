import { UrlInput } from "@/components/UrlInput";

const workflow = [
  {
    step: "01",
    title: "Paste a GET endpoint",
    copy: "Use a public JSON API URL. Protocols are optional, so quick pastes still work.",
  },
  {
    step: "02",
    title: "Inspect the shape",
    copy: "Check the raw response next to the inferred Draft 2020-12 JSON Schema.",
  },
  {
    step: "03",
    title: "Copy usable models",
    copy: "Generate TypeScript, Go, Rust, or Python models without leaving the page.",
  },
];

export default function Home() {
  return (
    <main className="shell home-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">API Schema</p>
          <h1>Turn an API response into a usable schema.</h1>
          <p className="lede">
            Paste a public endpoint, review the response, then copy a JSON Schema or typed models for your app.
          </p>
        </div>
        <aside className="hero-note" aria-label="Use case">
          <span className="note-kicker">Built for quick checks</span>
          <p>Inspect unfamiliar APIs before committing them to client code or docs.</p>
        </aside>
      </section>

      <UrlInput />

      <section className="home-grid" aria-label="Workflow">
        {workflow.map((item) => (
          <article className="info-card" key={item.step}>
            <span className="card-index">{item.step}</span>
            <h2>{item.title}</h2>
            <p>{item.copy}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
