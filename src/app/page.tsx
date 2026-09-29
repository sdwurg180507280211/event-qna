export default function HomePage() {
  return (
    <main className="landing-shell">
      <section className="landing-card">
        <span className="eyebrow">EVENT Q&amp;A</span>
        <h1>活动匿名提问系统</h1>
        <p className="muted">
          CWID 准入、匿名提问、人工审核、实时问题池与直播间身份透传。
        </p>
        <div className="landing-actions">
          <a className="button primary" href="/event/demo/login">
            打开 Demo
          </a>
          <a className="button secondary" href="/admin">
            管理后台
          </a>
        </div>
      </section>
    </main>
  );
}
