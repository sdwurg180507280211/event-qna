"use client";

import { FormEvent, useEffect, useState } from "react";
import { Brand } from "./Brand";
import { Icon } from "./Icon";

type EventInfo = {
  code: string;
  title: string;
  logoUrl: string | null;
};

export function LoginClient({
  eventId,
  ticket,
}: {
  eventId: string;
  ticket?: string;
}) {
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [cwid, setCwid] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(Boolean(ticket));

  useEffect(() => {
    fetch(`/api/events/${encodeURIComponent(eventId)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("活动不存在或已结束");
        return response.json();
      })
      .then((data) => setEvent(data.event))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "无法加载活动"),
      );
  }, [eventId]);

  useEffect(() => {
    if (!ticket) return;
    window.history.replaceState(
      null,
      "",
      `/event/${encodeURIComponent(eventId)}/login`,
    );

    let cancelled = false;
    setBusy(true);
    setError("");

    fetch("/api/auth/ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventCode: eventId, ticket }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "直播身份验证失败");
        }
        if (!cancelled) {
          window.location.replace(`/event/${encodeURIComponent(eventId)}`);
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "直播身份验证失败");
          setBusy(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, ticket]);

  async function handleSubmit(eventObject: FormEvent) {
    eventObject.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/cwid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventCode: eventId, cwid }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "验证失败");
      }

      window.location.replace(`/event/${encodeURIComponent(eventId)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "验证失败");
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-hero">
        <Brand title={event?.title} logoUrl={event?.logoUrl} />
        <div className="hero-copy">
          <span className="eyebrow">LET’S TALK · 活动互动</span>
          <h1>
            每一个提问，
            <br />
            都是对话的开始<span>。</span>
          </h1>
          <p>
            分享好奇，连接彼此。
            <br />
            期待听到你的声音。
          </p>
        </div>
        <div className="dialogue-art" aria-hidden="true">
          <div className="art-bubble">
            <i />
            <i />
            <i />
          </div>
          <div className="art-bubble small-bubble">
            <i />
            <i />
            <i />
          </div>
          <span className="art-caption">YOUR VOICE MATTERS</span>
        </div>
        <div className="hero-bottom">
          {event?.title ?? "Event Q&A"}
          <span>开放交流 · 共同成长</span>
        </div>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <span className="login-shield">
            <Icon name="shield" size={25} />
          </span>
          <div>
            <span className="eyebrow">WELCOME TO THE CONVERSATION</span>
            <h2>欢迎参与提问</h2>
            <p className="muted">验证活动身份，开启本次对话</p>
          </div>
          <label className="login-label" htmlFor="cwid">
            请输入您的 CWID <small>Please enter your CWID</small>
          </label>
          <input
            id="cwid"
            className="text-input large"
            value={cwid}
            maxLength={100}
            onChange={(e) => setCwid(e.target.value)}
            autoComplete="username"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="例如 C10001"
            disabled={busy}
            aria-describedby="login-help"
          />
          {ticket && busy && (
            <div className="notice" role="status">
              正在验证直播间身份…
            </div>
          )}
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <button
            className="button primary wide"
            disabled={busy || !event || !cwid.trim()}
          >
            {busy ? "验证中…" : "登录 / Login"}
            <Icon name="chevron" size={18} />
          </button>
          <p id="login-help" className="login-help">
            <Icon name="shield" size={15} /> CWID 仅用于活动身份验证
            <br />
            <span>问题在公开页面中均以匿名形式展示。</span>
          </p>
        </form>
        <footer className="login-footer">
          Event Q&A · 让每一个问题，都被听见
        </footer>
      </section>
    </main>
  );
}
