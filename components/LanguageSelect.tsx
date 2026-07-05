export function LanguageSelect() {
  return (
    <section className="panel" aria-label="Snippet language">
      <div className="row">
        <select className="select" defaultValue="curl">
          <option value="curl">curl</option>
          <option value="javascript">JavaScript fetch</option>
          <option value="python">Python</option>
          <option value="go">Go</option>
        </select>
        <button className="button" type="button">Generate snippet</button>
      </div>
    </section>
  );
}
