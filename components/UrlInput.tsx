export function UrlInput() {
  return (
    <section className="panel" aria-label="URL input">
      <div className="row">
        <input className="input" placeholder="api.example.com/users?limit=10" />
        <button className="button" type="button">Fetch</button>
      </div>
    </section>
  );
}
