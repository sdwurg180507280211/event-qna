"use client";

import { FormEvent, useEffect, useState } from "react";

type EventInfo = {
  code: string;
  title: string;
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
      .catch((cause) => setError(cause instanceof Error ? cause.message : "无法加载活动"));
  }, [eventId]);

  useEffect(() => {
    if (!ticket) return;

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
        <div>
          <span className="eyebrow">DIALOGUE</span>
          <h1>{event?.title ?? "Event Q&A"}</h1>
          <p>已从直播间验证身份的用户会自动进入提问页面。</p>
        </div>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <div>
            <span className="eyebrow">IDENTITY CHECK</span>
            <h2>请输入您的 CWID</h2>
            <p className="muted">Please enter your CWID</p>
          </div>

          <input
            className="text-input large"
            value={cwid}
            onChange={(e) => setCwid(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="CWID"
            disabled={busy}
            aria-label="CWID"
          />

          {ticket && busy ? (
            <div className="notice">正在验证直播间身份…</div>
          ) : null}
          {error ? <div className="error-box">{error}</div> : null}

          <button className="button primary wide" disabled={busy || !cwid.trim()}>
            {busy ? "验证中…" : "登录 / Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
