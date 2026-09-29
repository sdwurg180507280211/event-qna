"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";

type AdminQuestion = {
  id: string;
  cwid: string;
  content: string;
  status: Status;
  createdAt: string;
  voteCount: number;
};

type WhitelistEntry = {
  cwid: string;
  name: string | null;
  enabled: boolean;
};

const statusLabels: Record<Status, string> = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已拒绝",
  HIDDEN: "已下架",
};

export function AdminClient() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [eventCode, setEventCode] = useState("demo");
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [filter, setFilter] = useState<"ALL" | Status>("PENDING");
  const [bulk, setBulk] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAll = useCallback(async () => {
    setError("");

    const [questionResponse, whitelistResponse] = await Promise.all([
      fetch(`/api/admin/questions?eventCode=${encodeURIComponent(eventCode)}`, {
        cache: "no-store",
      }),
      fetch(`/api/admin/whitelist?eventCode=${encodeURIComponent(eventCode)}`, {
        cache: "no-store",
      }),
    ]);

    if (questionResponse.status === 401 || whitelistResponse.status === 401) {
      setAuthenticated(false);
      return;
    }

    if (!questionResponse.ok || !whitelistResponse.ok) {
      const data = await questionResponse.json().catch(() => ({}));
      throw new Error(data.error || "无法加载后台数据，请检查活动代码");
    }

    const [questionData, whitelistData] = await Promise.all([
      questionResponse.json(),
      whitelistResponse.json(),
    ]);

    setQuestions(questionData.questions);
    setEntries(whitelistData.entries);
    setAuthenticated(true);
  }, [eventCode]);

  useEffect(() => {
    loadAll().catch((cause) => {
      setAuthenticated(false);
      setError(cause instanceof Error ? cause.message : "无法加载后台");
    });
  }, [loadAll]);

  const visibleQuestions = useMemo(
    () =>
      filter === "ALL"
        ? questions
        : questions.filter((question) => question.status === filter),
    [filter, questions],
  );

  async function login(eventObject: FormEvent) {
    eventObject.preventDefault();
    setError("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error || "登录失败");
      return;
    }

    setPassword("");
    setAuthenticated(true);
    await loadAll();
  }

  async function moderate(id: string, status: Status) {
    setError("");
    const response = await fetch(`/api/admin/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      setError("审核操作失败");
      return;
    }

    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? { ...question, status } : question,
      ),
    );
  }

  async function addWhitelist() {
    const parsed = bulk
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [cwid, ...nameParts] = line.split(/[,\t]/);
        return {
          cwid: cwid.trim(),
          name: nameParts.join(" ").trim() || undefined,
        };
      })
      .filter((entry) => entry.cwid);

    if (!parsed.length) {
      setError("请输入至少一个 CWID");
      return;
    }

    const response = await fetch("/api/admin/whitelist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventCode, entries: parsed }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "白名单导入失败");
      return;
    }

    setBulk("");
    setNotice(`已导入/更新 ${data.count} 条白名单记录`);
    await loadAll();
  }

  async function disableWhitelist(cwid: string) {
    const response = await fetch("/api/admin/whitelist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventCode, cwid }),
    });

    if (!response.ok) {
      setError("禁用失败");
      return;
    }

    setEntries((current) =>
      current.map((entry) =>
        entry.cwid === cwid ? { ...entry, enabled: false } : entry,
      ),
    );
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
  }

  if (authenticated !== true) {
    return (
      <main className="admin-login-shell">
        <form className="admin-login-card" onSubmit={login}>
          <span className="eyebrow">ADMIN</span>
          <h1>Event Q&A 管理后台</h1>
          <p className="muted">登录后进行问题审核和 CWID 白名单维护。</p>
          <input
            className="text-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="管理员密码"
            autoComplete="current-password"
          />
          {error ? <div className="error-box">{error}</div> : null}
          <button className="button primary wide" disabled={!password}>
            登录
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <span className="eyebrow">ADMIN CONSOLE</span>
          <h1>Event Q&A</h1>
        </div>
        <div className="header-actions">
          <input
            className="text-input compact"
            value={eventCode}
            onChange={(e) => setEventCode(e.target.value)}
            onBlur={() => loadAll().catch(() => undefined)}
            aria-label="活动代码"
          />
          <button className="button secondary small" onClick={() => loadAll()}>
            刷新
          </button>
          <button className="button ghost small" onClick={logout}>
            退出
          </button>
        </div>
      </header>

      {error ? <div className="error-box page-message">{error}</div> : null}
      {notice ? <div className="success-box page-message">{notice}</div> : null}

      <div className="admin-grid">
        <section className="panel admin-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">MODERATION</span>
              <h2>问题审核</h2>
            </div>
            <span className="count-badge">{questions.length}</span>
          </div>

          <div className="status-tabs">
            {(["PENDING", "APPROVED", "REJECTED", "HIDDEN", "ALL"] as const).map(
              (status) => (
                <button
                  key={status}
                  className={filter === status ? "active" : ""}
                  onClick={() => setFilter(status)}
                >
                  {status === "ALL" ? "全部" : statusLabels[status]}
                </button>
              ),
            )}
          </div>

          <div className="admin-question-list">
            {visibleQuestions.length === 0 ? (
              <div className="empty-state">当前没有问题</div>
            ) : (
              visibleQuestions.map((question) => (
                <article className="admin-question-card" key={question.id}>
                  <div className="question-meta">
                    <strong>{statusLabels[question.status]}</strong>
                    <span>{question.cwid}</span>
                    <span>{new Date(question.createdAt).toLocaleString()}</span>
                    <span>♡ {question.voteCount}</span>
                  </div>
                  <p>{question.content}</p>
                  <div className="moderation-actions">
                    <button
                      className="button approve small"
                      onClick={() => moderate(question.id, "APPROVED")}
                    >
                      通过
                    </button>
                    <button
                      className="button secondary small"
                      onClick={() => moderate(question.id, "REJECTED")}
                    >
                      拒绝
                    </button>
                    <button
                      className="button ghost small"
                      onClick={() => moderate(question.id, "HIDDEN")}
                    >
                      下架
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="panel admin-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ACCESS</span>
              <h2>CWID 白名单</h2>
            </div>
            <span className="count-badge">
              {entries.filter((entry) => entry.enabled).length}
            </span>
          </div>

          <label className="field-label" htmlFor="whitelist-bulk">
            批量添加（每行：CWID,姓名）
          </label>
          <textarea
            id="whitelist-bulk"
            className="bulk-input"
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={"C10001,张三\nC10002,李四"}
          />
          <button className="button primary" onClick={addWhitelist}>
            导入 / 更新
          </button>

          <div className="whitelist-list">
            {entries.map((entry) => (
              <div
                className={`whitelist-row ${entry.enabled ? "" : "disabled"}`}
                key={entry.cwid}
              >
                <div>
                  <strong>{entry.cwid}</strong>
                  <span>{entry.name || "—"}</span>
                </div>
                <div className="row-actions">
                  <span>{entry.enabled ? "有效" : "已禁用"}</span>
                  {entry.enabled ? (
                    <button
                      className="text-button"
                      onClick={() => disableWhitelist(entry.cwid)}
                    >
                      禁用
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
