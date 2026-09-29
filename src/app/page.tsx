export default function HomePage() {
  return (
    <main className="landing-shell">
      <section className="landing-card landing-card-wide">
        <span className="eyebrow">EVENT Q&amp;A</span>
        <h1>活动提问系统</h1>
        <p className="muted">
          三个独立入口：提问、问题审批、iPad 展示。
        </p>
        <div className="landing-actions landing-actions-three">
          <a className="button primary" href="/event/demo/ask">
            提问页面
          </a>
          <a className="button secondary" href="/admin">
            管理后台
          </a>
          <a className="button secondary" href="/event/demo/display">
            展示页面
          </a>
        </div>
      </section>
    </main>
  );
}
