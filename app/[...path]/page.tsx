import { JsonViewer } from "@/components/JsonViewer";
import { LanguageSelect } from "@/components/LanguageSelect";
import { UrlInput } from "@/components/UrlInput";

type ResultPageProps = {
  params: Promise<{ path: string[] }>;
};

export default async function ResultPage({ params }: ResultPageProps) {
  const { path } = await params;
  const requestedPath = path.join("/");

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">API Peek</p>
        <h1>Result page scaffold</h1>
        <p className="lede">This catch-all page will fetch and render JSON for: {requestedPath}</p>
      </section>

      <UrlInput />
      <LanguageSelect />
      <JsonViewer requestedUrl={requestedPath} />
    </main>
  );
}
