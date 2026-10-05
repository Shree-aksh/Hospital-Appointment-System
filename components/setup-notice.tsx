export function SetupNotice() {
  return (
    <section className="panel setup-panel">
      <div className="section-kicker">Configuration required</div>
      <h1>PostgreSQL connection missing</h1>
      <p className="muted">
        This app is production-ready for PostgreSQL, but the database connection string is not set in the current
        environment.
      </p>
      <div className="setup-grid">
        <div className="metric-row">
          <span>Required env</span>
          <strong>DATABASE_URL</strong>
        </div>
        <div className="metric-row">
          <span>Optional bootstrap</span>
          <strong>INITIAL_ADMIN_*</strong>
        </div>
      </div>
      <p className="muted">
        Add the values in <code>.env.local</code>, restart the dev server, and the app will use PostgreSQL instead of
        rendering this screen.
      </p>
    </section>
  );
}
