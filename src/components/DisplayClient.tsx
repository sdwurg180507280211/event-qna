"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Brand } from "./Brand";

type EventInfo = {
  code: string;
  title: string;
  logoUrl: string | null;
};

type Question = {
  id: string;
  content: string;
  createdAt: string;
};

function displayTime(value: string) {
  return new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DisplayClient({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);

  const eventBase = `/api/events/${encodeURIComponent(eventId)}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(eventBase, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("活动不存在或已结束");
        return response.json();
      })
      .then((data) => setEvent(data.event))
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "无法加载活动");
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [eventBase]);

  const refresh = useCallback(async () => {
    const id = ++generation.current;
    const response = await fetch(`${eventBase}/display`, {
      cache: "no-store",
    });

    if (id !== generation.current) return;

    if (response.status === 404) {
      setQuestions([]);
      setTotal(0);
      setError("活动不存在或已结束");
      setConnected(false);
      setLoading(false);
      return;
    }

    if (!response.ok) {
      throw new Error("展示页面暂时无法更新");
    }

    const data = await response.json();
    if (id !== generation.current) return;

    setQuestions(data.questions);
    setTotal(data.total);
    setError("");
    setConnected(true);
    setLoading(false);
  }, [eventBase]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const run = async () => {
      try {
        if (!document.hidden) await refresh();
      } catch {
        if (!stopped) {
          setConnected(false);
          setLoading(false);
        }
      }

      if (!stopped) timer = setTimeout(run, 1500);
    };

    void run();

    return () => {
      stopped = true;
      clearTimeout(timer);
      generation.current++;
    };
  }, [refresh]);

  return (
    <main className="display-shell">
      <header className="display-header">
        <Brand title={event?.title} logoUrl={event?.logoUrl} />
        <div className="display-live-status">
          <span className={`live-dot ${connected ? "" : "display-offline-dot"}`} />
          <span>{connected ? "LIVE · 实时更新" : "正在重新连接"}</span>
        </div>
      </header>

      <section className="display-stage">
        <div className="display-title-row">
          <div>
            <span className="display-eyebrow">QUESTIONS</span>
            <h1>现场提问</h1>
          </div>
          <div className="display-count">
            <strong>{total}</strong>
            <span>QUESTIONS</span>
          </div>
        </div>

        {error ? (
          <div className="display-state-card">{error}</div>
        ) : loading ? (
          <div className="display-state-card">正在加载问题…</div>
        ) : questions.length === 0 ? (
          <div className="display-state-card">
            <strong>等待第一个问题</strong>
            <span>审核通过的问题会自动显示在这里</span>
          </div>
        ) : (
          <div className="display-question-list" aria-live="polite">
            {questions.map((question, index) => (
              <article className="display-question-card" key={question.id}>
                <div className="display-question-number">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="display-question-content">
                  <div className="display-question-meta">
                    <span>QUESTION</span>
                    <time>{displayTime(question.createdAt)}</time>
                  </div>
                  <p>{question.content}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
