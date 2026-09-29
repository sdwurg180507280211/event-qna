"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { QrJoin } from "@/components/QrJoin";

type EventInfo = {
  code: string;
  title: string;
  returnUrl: string | null;
  logoUrl: string | null;
};

type Question = {
  id: string;
  content: string;
  createdAt: string;
  voteCount: number;
  hasVoted: boolean;
};

export function EventClient({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sort, setSort] = useState<"latest" | "hot">("latest");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const goToLogin = useCallback(() => {
    window.location.replace(`/event/${encodeURIComponent(eventId)}/login`);
  }, [eventId]);

  const loadQuestions = useCallback(async () => {
    const response = await fetch(
      `/api/events/${encodeURIComponent(eventId)}/questions?sort=${sort}`,
      { cache: "no-store" },
    );

    if (response.status === 401) {
      goToLogin();
      return;
    }

    if (!response.ok) {
      throw new Error("无法加载问题池");
    }

    const data = await response.json();
    setQuestions(data.questions);
  }, [eventId, goToLogin, sort]);

  useEffect(() => {
    fetch(`/api/events/${encodeURIComponent(eventId)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("活动不存在或已结束");
        return response.json();
      })
      .then((data) => setEvent(data.event))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "无法加载活动"));
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      loadQuestions().catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "无法加载问题池");
        }
      });
    };

    refresh();
    const timer = window.setInterval(refresh, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [loadQuestions]);

  async function submitQuestion(eventObject: FormEvent) {
    eventObject.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/events/${encodeURIComponent(eventId)}/questions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );

      if (response.status === 401) {
        goToLogin();
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "提交失败");

      setContent("");
      setMessage("问题已提交，审核通过后会出现在问题池。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleVote(questionId: string) {
    const response = await fetch(
      `/api/events/${encodeURIComponent(eventId)}/questions/${questionId}/vote`,
      { method: "POST" },
    );

    if (response.status === 401) {
      goToLogin();
      return;
    }

    if (!response.ok) {
      setError("点赞失败，请稍后重试");
      return;
    }

    const data = await response.json();
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? {
              ...question,
              hasVoted: data.voted,
              voteCount: data.voteCount,
            }
          : question,
      ),
    );
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    goToLogin();
  }

  return (
    <main className="event-shell">
      <header className="event-header">
        <div className="brand-lockup">
          <span className="brand-dot" />
          <strong>{event?.title ?? "Event Q&A"}</strong>
        </div>
        <div className="header-actions">
          {event?.returnUrl ? (
            <a className="button ghost small" href={event.returnUrl}>
              返回直播
            </a>
          ) : null}
          <button className="button ghost small" onClick={logout}>
            退出
          </button>
        </div>
      </header>

      <div className="event-grid">
        <aside className="ask-column">
          <section className="panel ask-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">ASK</span>
                <h2>我想提问</h2>
              </div>
              <span className="anonymous-pill">匿名提问</span>
            </div>

            <form onSubmit={submitQuestion}>
              <textarea
                className="question-input"
                placeholder="请输入您想问的问题……"
                maxLength={1000}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="composer-footer">
                <span>{content.length}/1000</span>
                <button
                  className="button primary"
                  disabled={submitting || content.trim().length < 2}
                >
                  {submitting ? "提交中…" : "提交问题"}
                </button>
              </div>
            </form>

            {message ? <div className="success-box">{message}</div> : null}
            {error ? <div className="error-box">{error}</div> : null}
          </section>

          <QrJoin eventId={eventId} />
        </aside>

        <section className="panel question-pool">
          <div className="pool-header">
            <div>
              <span className="eyebrow">QUESTIONS</span>
              <h2>问题池</h2>
              <p className="muted">共 {questions.length} 条已通过审核的问题</p>
            </div>
            <div className="segmented" role="group" aria-label="问题排序">
              <button
                className={sort === "latest" ? "active" : ""}
                onClick={() => setSort("latest")}
              >
                最新
              </button>
              <button
                className={sort === "hot" ? "active" : ""}
                onClick={() => setSort("hot")}
              >
                热门
              </button>
            </div>
          </div>

          <div className="question-list">
            {questions.length === 0 ? (
              <div className="empty-state">
                <strong>暂时还没有已发布的问题</strong>
                <p>提交的问题会在管理员审核通过后显示在这里。</p>
              </div>
            ) : (
              questions.map((question) => (
                <article className="question-card" key={question.id}>
                  <div className="question-meta">
                    <strong>匿名</strong>
                    <span>{new Date(question.createdAt).toLocaleString()}</span>
                  </div>
                  <p>{question.content}</p>
                  <button
                    className={`vote-button ${question.hasVoted ? "voted" : ""}`}
                    onClick={() => toggleVote(question.id)}
                    aria-label={question.hasVoted ? "取消点赞" : "点赞"}
                  >
                    ♡ <span>{question.voteCount}</span>
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
