type JsonViewerProps = {
  requestedUrl?: string;
};

export function JsonViewer({ requestedUrl = "https://api.example.com/users" }: JsonViewerProps) {
  const placeholderJson = {
    meta: {
      requestedUrl,
      status: 200,
    },
    data: [],
  };

  return (
    <section className="panel" aria-label="JSON viewer">
      <pre>{JSON.stringify(placeholderJson, null, 2)}</pre>
    </section>
  );
}
