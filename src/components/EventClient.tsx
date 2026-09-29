"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { QrJoin } from "./QrJoin";
import { Icon } from "./Icon";
import { Brand } from "./Brand";
import { Pagination } from "./Pagination";
import { QuestionBody } from "./QuestionBody";
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
function relativeTime(value: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60000),
  );
  return minutes < 1
    ? "刚刚"
    : minutes < 60
      ? `${minutes} 分钟前`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)} 小时前`
        : `${Math.floor(minutes / 1440)} 天前`;
}
export function EventClient({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sort, setSort] = useState<"latest" | "hot">("latest");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string[]>([]);
  const voteLocks = useRef(new Set<string>());
  const generation = useRef(0);
  const base = `/api/events/${encodeURIComponent(eventId)}`;
  const goToLogin = useCallback(
    () =>
      window.location.replace(`/event/${encodeURIComponent(eventId)}/login`),
    [eventId],
  );
  const loadQuestions = useCallback(async () => {
    const id = ++generation.current;
    const response = await fetch(
      `${base}/questions?sort=${sort}&page=${page}`,
      { cache: "no-store" },
    );
    if (id !== generation.current) return;
    if (response.status === 401) {
      goToLogin();
      return;
    }
    if (!response.ok) throw new Error("暂时无法更新问题池，请检查网络");
    const data = await response.json();
    if (id !== generation.current) return;
    setQuestions(data.questions);
    setTotal(data.total);
    setPage(data.page);
    setSyncError("");
    setLoading(false);
  }, [base, goToLogin, sort, page]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(base, { signal: controller.signal, cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("活动不存在或已结束");
        setEvent((await r.json()).event);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [base]);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        if (!document.hidden) await loadQuestions();
      } catch {
        if (!stopped) {
          setSyncError("连接中断，正在尝试重新连接…");
          setLoading(false);
        }
      }
      if (!stopped) timer = setTimeout(refresh, 4000);
    };
    void refresh();
    return () => {
      stopped = true;
      clearTimeout(timer);
      generation.current++;
    };
  }, [loadQuestions]);
  async function submitQuestion(e: FormEvent) {
    e.preventDefault();
    if (submitting || content.trim().length < 2) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch(`${base}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (r.status === 401) {
        goToLogin();
        return;
      }
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "提交失败，请重试");
      setContent("");
      setMessage("问题已提交，审核通过后将出现在问题池。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络异常，请重试");
    } finally {
      setSubmitting(false);
    }
  }
  async function toggleVote(q: Question) {
    if (voteLocks.current.has(q.id)) return;
    voteLocks.current.add(q.id);
    setVoting([...voteLocks.current]);
    try {
      const r = await fetch(`${base}/questions/${q.id}/vote`, {
        method: q.hasVoted ? "DELETE" : "PUT",
      });
      if (r.status === 401) {
        goToLogin();
        return;
      }
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "点赞失败");
      setQuestions((current) =>
        current.map((item) =>
          item.id === q.id
            ? { ...item, hasVoted: data.voted, voteCount: data.voteCount }
            : item,
        ),
      );
      await loadQuestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络异常，请重试");
    } finally {
      voteLocks.current.delete(q.id);
      setVoting([...voteLocks.current]);
    }
  }
  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      goToLogin();
    } catch {
      setError("退出失败，请重试");
    }
  }
  return (
    <main className="event-shell">
      <header className="event-header">
        <div>
          {event?.returnUrl && (
            <a className="back-link" href={event.returnUrl}>
              <Icon name="arrow" size={16} /> 返回直播
            </a>
          )}
        </div>
        <Brand title={event?.title} logoUrl={event?.logoUrl} />
        <button className="button ghost small" onClick={logout}>
          <Icon name="logout" size={16} /> 退出
        </button>
      </header>
      <div className="event-grid">
        <aside className="ask-column">
          <section className="panel ask-card">
            <div className="section-heading">
              <h1>我想提问</h1>
              <span className="anonymous-pill">
                <Icon name="shield" size={14} /> 匿名提问
              </span>
            </div>
            <form onSubmit={submitQuestion}>
              <label className="sr-only" htmlFor="question-content">
                问题内容
              </label>
              <textarea
                id="question-content"
                className="question-input"
                placeholder="请输入您想问的问题…"
                maxLength={1000}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={submitting}
              />
              <div className="composer-counter">
                <span>至少 2 个字符</span>
                <span>{content.length} / 1000</span>
              </div>
              <button
                className="button primary wide"
                disabled={!event || submitting || content.trim().length < 2}
              >
                <Icon name="send" size={17} />
                {submitting ? "提交中…" : "提交问题"}
              </button>
            </form>
            <p className="privacy-note">
              <Icon name="shield" size={14} /> 问题公开时不显示姓名或 CWID
            </p>
            {message && (
              <div className="success-box" role="status">
                {message}
              </div>
            )}
            {error && (
              <div className="error-box" role="alert">
                {error}
              </div>
            )}
          </section>
          <QrJoin eventId={eventId} />
        </aside>
        <section className="panel question-pool" aria-label="问题池">
          <div className="pool-header">
            <div className="pool-title">
              <span className="pool-icon">
                <Icon name="chat" size={23} />
              </span>
              <div>
                <h2>
                  问题池 <span className="count-badge">{total}</span>
                </h2>
              </div>
            </div>
            <div className="segmented" role="group" aria-label="问题排序">
              {(["latest", "hot"] as const).map((value) => (
                <button
                  key={value}
                  aria-pressed={sort === value}
                  className={sort === value ? "active" : ""}
                  onClick={() => {
                    setSort(value);
                    setPage(1);
                  }}
                >
                  {value === "latest" ? "最新" : "热门"}
                </button>
              ))}
            </div>
          </div>
          <div
            className={`sync-status ${syncError ? "offline" : ""}`}
            role="status"
          >
            <span className="live-dot" />
            {syncError || "自动更新 · 仅展示已通过审核的问题"}
          </div>
          <div className="question-list" aria-busy={loading}>
            {loading ? (
              <div className="empty-state">正在加载问题…</div>
            ) : !questions.length ? (
              <div className="empty-state">
                <p>暂无已通过审核的问题</p>
              </div>
            ) : (
              questions.map((q) => (
                <article className="question-card" key={q.id}>
                  <div className="question-meta">
                    <span className="anonymous-avatar">
                      <Icon name="users" size={15} />
                    </span>
                    <strong>匿名</strong>
                    <time title={new Date(q.createdAt).toLocaleString("zh-CN")}>
                      {relativeTime(q.createdAt)}
                    </time>
                    <button
                      className={`vote-button ${q.hasVoted ? "voted" : ""}`}
                      aria-label={q.hasVoted ? "取消点赞" : "点赞"}
                      aria-pressed={q.hasVoted}
                      disabled={voting.includes(q.id)}
                      onClick={() => toggleVote(q)}
                    >
                      <Icon name="like" size={17} />
                      <span>{q.voteCount}</span>
                    </button>
                  </div>
                  <QuestionBody content={q.content} />
                </article>
              ))
            )}
          </div>
          <Pagination
            page={page}
            total={total}
            pageSize={6}
            onChange={setPage}
          />
        </section>
      </div>
    </main>
  );
}
