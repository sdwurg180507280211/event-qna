"use client";

import { FormEvent, useEffect, useState } from "react";
import { Brand } from "./Brand";
import { Icon } from "./Icon";

type EventInfo = {
  code: string;
  title: string;
  returnUrl: string | null;
  logoUrl: string | null;
};

export function AskClient({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const base = `/api/events/${encodeURIComponent(eventId)}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(base, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("活动不存在或已结束");
        return response.json();
      })
      .then((data) => setEvent(data.event))
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "无法加载活动");
        }
      });

    return () => controller.abort();
  }, [base]);

  async function submitQuestion(eventObject: FormEvent) {
    eventObject.preventDefault();
    if (submitting || content.trim().length < 2) return;

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${base}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "提交失败，请稍后重试");
      }

      setContent("");
      setMessage("问题已提交，审核通过后将出现在展示页面。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "网络异常，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="ask-page-shell">
      <header className="ask-page-header">
        <div>
          {event?.returnUrl ? (
            <a className="back-link" href={event.returnUrl}>
              <Icon name="arrow" size={16} />
              返回直播
            </a>
          ) : null}
        </div>
        <Brand title={event?.title} logoUrl={event?.logoUrl} />
        <div aria-hidden="true" />
      </header>

      <section className="ask-page-main">
        <div className="ask-page-intro">
          <span className="eyebrow">LIVE Q&amp;A</span>
          <h1>有什么想问的？</h1>
          <p>匿名提交问题。审核通过后，问题会实时出现在展示页面。</p>
        </div>

        <form className="panel ask-page-card" onSubmit={submitQuestion}>
          <div className="section-heading">
            <div>
              <h2>提交问题</h2>
              <p className="muted">Question submission</p>
            </div>
            <span className="anonymous-pill">
              <Icon name="shield" size={14} />
              匿名
            </span>
          </div>

          <label className="sr-only" htmlFor="ask-question-content">
            问题内容
          </label>
          <textarea
            id="ask-question-content"
            className="ask-page-input"
            placeholder="请输入您想问的问题…"
            maxLength={1000}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={submitting || !event}
          />

          <div className="ask-page-counter">
            <span>至少 2 个字符</span>
            <span>{content.length} / 1000</span>
          </div>

          <button
            className="button primary wide ask-page-submit"
            disabled={!event || submitting || content.trim().length < 2}
          >
            <Icon name="send" size={18} />
            {submitting ? "提交中…" : "提交问题"}
          </button>

          <p className="privacy-note">
            <Icon name="shield" size={14} />
            提问将以匿名形式展示
          </p>

          {message ? (
            <div className="success-box" role="status">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="error-box" role="alert">
              {error}
            </div>
          ) : null}
        </form>
      </section>
    </main>
  );
}
