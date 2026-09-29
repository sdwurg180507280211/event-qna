"use client";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Icon } from "./Icon";
import { Brand } from "./Brand";
import { Pagination } from "./Pagination";
type Status = "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
type Question = {
  id: string;
  cwid: string;
  content: string;
  status: Status;
  createdAt: string;
};
type Entry = { cwid: string; name: string | null; enabled: boolean };
type Settings = {
  code: string;
  title: string;
  active: boolean;
  returnUrl: string | null;
  logoUrl: string | null;
};
const labels: Record<Status, string> = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已拒绝",
  HIDDEN: "已下架",
};
export function AdminClient() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [eventCode, setEventCode] = useState("demo");
  const [draftCode, setDraftCode] = useState("demo");
  const [section, setSection] = useState<
    "questions" | "whitelist" | "settings"
  >("questions");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [counts, setCounts] = useState<Partial<Record<Status, number>>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"ALL" | Status>("PENDING");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [bulk, setBulk] = useState("");
  const [search, setSearch] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [connected, setConnected] = useState(true);
  const requestGeneration = useRef(0);
  const actionLock = useRef(false);
  const api = useCallback(async (url: string, options?: RequestInit) => {
    const r = await fetch(url, { cache: "no-store", ...options });
    if (r.status === 401) {
      setAuthenticated(false);
      throw new Error("请登录管理员账号");
    }
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "操作失败，请重试");
    return data;
  }, []);
  const loadQuestions = useCallback(async () => {
    const generation = ++requestGeneration.current;
    const data = await api(
      `/api/admin/questions?eventCode=${encodeURIComponent(eventCode)}&status=${filter}&page=${page}&search=${encodeURIComponent(query)}`,
    );
    if (generation !== requestGeneration.current) return;
    setQuestions(data.questions);
    setCounts(data.counts);
    setTotal(data.total);
    setPage(data.page);
    setConnected(true);
  }, [api, eventCode, filter, page, query]);
  const loadEntries = useCallback(async () => {
    const data = await api(
      `/api/admin/whitelist?eventCode=${encodeURIComponent(eventCode)}`,
    );
    setEntries(data.entries);
  }, [api, eventCode]);
  useEffect(() => {
    let alive = true;
    api(`/api/admin/events/${encodeURIComponent(eventCode)}`)
      .then((data) => {
        if (!alive) return;
        setSettings(data.event);
        setEventTitle(data.event.title);
        setAuthenticated(true);
        setError("");
      })
      .catch((e) => {
        if (alive) {
          setError(e.message === "请登录管理员账号" ? "" : e.message);
          setAuthenticated((current) => (current === null ? false : current));
        }
      });
    return () => {
      alive = false;
    };
  }, [api, eventCode]);
  useEffect(() => {
    if (!authenticated) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        if (!document.hidden) await loadQuestions();
      } catch {
        if (!stopped) setConnected(false);
      }
      if (!stopped) timer = setTimeout(refresh, 5000);
    };
    void refresh();
    return () => {
      stopped = true;
      clearTimeout(timer);
      requestGeneration.current++;
    };
  }, [authenticated, loadQuestions]);
  useEffect(() => {
    if (authenticated) loadEntries().catch((e) => setError(e.message));
  }, [authenticated, loadEntries]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(questionSearch.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [questionSearch]);
  async function action(key: string, operation: () => Promise<void>) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await operation();
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络异常，请重试");
    } finally {
      actionLock.current = false;
      setBusy("");
    }
  }
  async function login(e: FormEvent) {
    e.preventDefault();
    await action("login", async () => {
      await api("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setPassword("");
      const data = await api(
        `/api/admin/events/${encodeURIComponent(eventCode)}`,
      );
      setSettings(data.event);
      setEventTitle(data.event.title);
      setAuthenticated(true);
    });
  }
  function moderate(q: Question, status: Status) {
    void action(q.id, async () => {
      await api(`/api/admin/questions/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setNotice(
        status === "APPROVED"
          ? "已通过，问题已进入公开问题池"
          : status === "PENDING"
            ? "已重新送审"
            : status === "HIDDEN"
              ? "问题已下架"
              : "问题已拒绝",
      );
      await loadQuestions();
    });
  }
  function importEntries() {
    void action("import", async () => {
      const parsed = bulk
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [cwid, ...name] = line.split(/[,，\t]/);
          return {
            cwid: cwid.trim(),
            name: name.join(" ").trim() || undefined,
          };
        });
      if (!parsed.length) throw new Error("请填写至少一个 CWID");
      const data = await api("/api/admin/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventCode, entries: parsed }),
      });
      setBulk("");
      await loadEntries();
      setNotice(`已导入 / 更新 ${data.count} 条记录`);
    });
  }
  function toggleEntry(entry: Entry) {
    void action(entry.cwid, async () => {
      await api("/api/admin/whitelist", {
        method: entry.enabled ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          entry.enabled
            ? { eventCode, cwid: entry.cwid }
            : {
                eventCode,
                entries: [{ cwid: entry.cwid, name: entry.name ?? undefined }],
              },
        ),
      });
      await loadEntries();
      setNotice(
        entry.enabled ? "历史名单条目已禁用，不影响公开提问" : "已重新启用",
      );
    });
  }
  function saveSettings(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    void action("settings", async () => {
      const data = await api(
        `/api/admin/events/${encodeURIComponent(eventCode)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...settings,
            returnUrl: settings.returnUrl ?? "",
            logoUrl: settings.logoUrl ?? "",
          }),
        },
      );
      setSettings(data.event);
      setEventTitle(data.event.title);
      setNotice("活动配置已保存");
    });
  }
  function switchEvent(e: FormEvent) {
    e.preventDefault();
    const code = draftCode.trim();
    if (!code) return;
    void action("event", async () => {
      const data = await api(`/api/admin/events/${encodeURIComponent(code)}`);
      setSettings(data.event);
      setEventTitle(data.event.title);
      setQuestions([]);
      setEntries([]);
      setCounts({});
      setTotal(0);
      setPage(1);
      setEventCode(code);
      setDraftCode(code);
      setSearch("");
      setQuestionSearch("");
      setQuery("");
    });
  }
  const filteredEntries = useMemo(
    () =>
      entries.filter((e) =>
        `${e.cwid} ${e.name ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [entries, search],
  );
  if (authenticated === null)
    return (
      <main className="admin-login-shell">
        <div className="notice">正在连接管理后台…</div>
      </main>
    );
  if (!authenticated)
    return (
      <main className="admin-login-shell">
        <form className="admin-login-card" onSubmit={login}>
          <Brand />
          <span className="eyebrow">MANAGEMENT CONSOLE</span>
          <h1>欢迎回来</h1>
          <p className="muted">登录后管理活动提问和参与权限。</p>
          <label htmlFor="admin-password" className="field-label">
            管理员密码
          </label>
          <input
            id="admin-password"
            className="text-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="请输入管理员密码"
          />
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <button
            className="button primary wide"
            disabled={!password || !!busy}
          >
            {busy ? "登录中…" : "进入管理后台"}
            <Icon name="chevron" size={18} />
          </button>
          <p className="login-help">Event Q&A · 活动管理中心</p>
        </form>
      </main>
    );
  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Brand />
        <div className="sidebar-label">活动管理</div>
        <nav aria-label="后台导航">
          {(
            [
              { id: "questions", label: "问题审核", icon: "chat" },
              { id: "whitelist", label: "历史白名单", icon: "users" },
              { id: "settings", label: "活动设置", icon: "settings" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={section === item.id ? "active" : ""}
              onClick={() => {
                setSection(item.id);
                setNotice("");
                setError("");
              }}
            >
              <Icon name={item.icon} />
              {item.label}
              {item.id === "questions" && !!counts.PENDING && (
                <span className="nav-count">{counts.PENDING}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Icon name="shield" size={18} />
          <span>
            管理员工作台<small>匿名提问 · 人工审核</small>
          </span>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <span className="breadcrumb">
            工作台 <span>/</span>{" "}
            {section === "questions"
              ? "问题审核"
              : section === "whitelist"
                ? "历史白名单"
                : "活动设置"}
          </span>
          <div className="header-actions">
            <a
              className="button ghost small"
              href={`/event/${encodeURIComponent(eventCode)}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="external" size={15} /> 查看用户端
            </a>
            <button
              className="button ghost small"
              disabled={!!busy}
              onClick={() =>
                void action("logout", async () => {
                  await api("/api/admin/logout", { method: "POST" });
                  setAuthenticated(false);
                })
              }
            >
              <Icon name="logout" size={15} />
              退出
            </button>
          </div>
        </header>
        <div className={`admin-content admin-content-${section}`}>
          <div className="admin-page-heading">
            <div>
              <h1>
                {section === "questions"
                  ? "问题审核"
                  : section === "whitelist"
                    ? "历史白名单"
                    : "活动设置"}
              </h1>
              <p className="muted">
                {eventTitle} <span className="dot-divider">·</span>{" "}
                {section === "questions"
                  ? "审核通过后，问题将自动展示在用户端"
                  : section === "whitelist"
                    ? "公开提问无需登录，此名单仅保留历史资料"
                    : "配置活动信息、品牌展示与直播入口"}
              </p>
            </div>
            <form className="event-switch" onSubmit={switchEvent}>
              <label htmlFor="event-code">当前活动</label>
              <div>
                <input
                  id="event-code"
                  className="text-input"
                  value={draftCode}
                  onChange={(e) => setDraftCode(e.target.value)}
                  maxLength={100}
                />
                <button className="button secondary small" disabled={!!busy}>
                  切换
                </button>
              </div>
            </form>
          </div>
          {error && (
            <div className="error-box page-message" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="success-box page-message" role="status">
              {notice}
            </div>
          )}
          {section === "questions" && (
            <>
              <div className="stats-grid">
                {(Object.keys(labels) as Status[]).map((status) => (
                  <button
                    className={`stat-card stat-${status.toLowerCase()} ${filter === status ? "active" : ""}`}
                    aria-pressed={filter === status}
                    key={status}
                    onClick={() => {
                      setFilter(status);
                      setPage(1);
                    }}
                  >
                    <span>{labels[status]}</span>
                    <strong>{counts[status] ?? 0}</strong>
                    <Icon
                      name={
                        status === "PENDING"
                          ? "clock"
                          : status === "APPROVED"
                            ? "check"
                            : "chat"
                      }
                      size={24}
                    />
                  </button>
                ))}
              </div>
              <section className="panel admin-section moderation-panel">
                <div className="section-heading moderation-toolbar">
                  <div>
                    <h2>
                      {filter === "ALL" ? "全部问题" : `${labels[filter]}问题`}
                    </h2>
                    <p className={`sync-status ${connected ? "" : "offline"}`}>
                      <span className="live-dot" />
                      {connected ? "自动更新中" : "连接中断，正在重试"}
                    </p>
                  </div>
                  <div className="moderation-tools">
                    <button
                      className={`button ${filter === "ALL" ? "secondary" : "ghost"} small`}
                      aria-pressed={filter === "ALL"}
                      onClick={() => {
                        setFilter("ALL");
                        setPage(1);
                      }}
                    >
                      全部问题
                    </button>
                    <label className="search-input">
                      <Icon name="search" size={16} />
                      <input
                        aria-label="搜索问题或 CWID"
                        placeholder="搜索问题或 CWID"
                        value={questionSearch}
                        onChange={(e) => setQuestionSearch(e.target.value)}
                        maxLength={200}
                      />
                    </label>
                    <button
                      className="button ghost small"
                      disabled={!!busy}
                      onClick={() => void action("refresh", loadQuestions)}
                    >
                      <Icon name="refresh" size={16} />
                      刷新
                    </button>
                  </div>
                </div>
                <div className="moderation-columns" aria-hidden="true">
                  <span>问题内容与提交信息</span>
                  <span>审核操作</span>
                </div>
                <div className="admin-question-list">
                  {!questions.length ? (
                    <div className="empty-state">
                      <span className="empty-icon">
                        <Icon name="check" size={32} />
                      </span>
                      <h3>
                        {filter === "PENDING"
                          ? "暂时没有待审核的问题"
                          : "暂无匹配的问题"}
                      </h3>
                      <p>新问题会自动出现在这里。</p>
                    </div>
                  ) : (
                    questions.map((q) => (
                      <article className="admin-question-card" key={q.id}>
                        <div className="question-meta">
                          <span
                            className={`status-label status-${q.status.toLowerCase()}`}
                          >
                            {labels[q.status]}
                          </span>
                          <strong>{q.cwid}</strong>
                          <time>
                            {new Date(q.createdAt).toLocaleString("zh-CN")}
                          </time>
                        </div>
                        <p>{q.content}</p>
                        <div className="moderation-actions">
                          {q.status === "PENDING" ? (
                            <>
                              <button
                                className="button approve small"
                                disabled={!!busy}
                                onClick={() => moderate(q, "APPROVED")}
                              >
                                <Icon name="check" size={15} />
                                通过
                              </button>
                              <button
                                className="button reject small"
                                disabled={!!busy}
                                onClick={() => moderate(q, "REJECTED")}
                              >
                                <Icon name="close" size={15} />
                                拒绝
                              </button>
                            </>
                          ) : q.status === "APPROVED" ? (
                            <button
                              className="button secondary small"
                              disabled={!!busy}
                              onClick={() => moderate(q, "HIDDEN")}
                            >
                              下架问题
                            </button>
                          ) : (
                            <button
                              className="button secondary small"
                              disabled={!!busy}
                              onClick={() => moderate(q, "PENDING")}
                            >
                              重新送审
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
                <Pagination
                  page={page}
                  total={total}
                  pageSize={12}
                  onChange={setPage}
                />
              </section>
            </>
          )}
          {section === "whitelist" && (
            <div className="whitelist-grid">
              <section className="panel admin-section">
                <h2>批量添加参与人</h2>
                <p className="muted">可直接粘贴 Excel 中的 CWID 和姓名。</p>
                <label className="field-label" htmlFor="whitelist-bulk">
                  每行一人，CWID 与姓名以逗号或制表符分隔
                </label>
                <textarea
                  id="whitelist-bulk"
                  className="bulk-input"
                  value={bulk}
                  onChange={(e) => setBulk(e.target.value)}
                  placeholder={"C10001,张三\nC10002,李四\nC10003"}
                />
                <p className="field-help">
                  姓名可选。重复 CWID 将更新资料并重新启用。
                </p>
                <button
                  className="button primary wide"
                  disabled={!!busy || !bulk.trim()}
                  onClick={importEntries}
                >
                  <Icon name="users" size={17} />
                  {busy === "import" ? "正在导入…" : "导入 / 更新白名单"}
                </button>
              </section>
              <section className="panel admin-section">
                <div className="section-heading">
                  <h2>参与人名单</h2>
                  <span className="count-badge">
                    {entries.filter((e) => e.enabled).length} 人有效
                  </span>
                </div>
                <label className="search-input full-search">
                  <Icon name="search" size={16} />
                  <input
                    aria-label="搜索 CWID 或姓名"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜索 CWID 或姓名"
                  />
                </label>
                <div className="whitelist-list">
                  {!filteredEntries.length ? (
                    <div className="empty-state">暂无匹配的参与人</div>
                  ) : (
                    filteredEntries.map((entry) => (
                      <div className="whitelist-row" key={entry.cwid}>
                        <span className="entry-avatar">
                          <Icon name="users" size={17} />
                        </span>
                        <div>
                          <strong>{entry.cwid}</strong>
                          <small>{entry.name || "未填写姓名"}</small>
                        </div>
                        <span
                          className={`status-label ${entry.enabled ? "status-approved" : "status-hidden"}`}
                        >
                          {entry.enabled ? "有效" : "已禁用"}
                        </span>
                        <button
                          className="text-button"
                          disabled={!!busy}
                          onClick={() => toggleEntry(entry)}
                        >
                          {entry.enabled ? "禁用" : "重新启用"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}
          {section === "settings" && settings && (
            <form className="panel settings-form" onSubmit={saveSettings}>
              <div className="section-heading">
                <div>
                  <h2>活动配置</h2>
                  <p className="muted">保存后将应用于参与者的活动页面。</p>
                </div>
                <Icon name="settings" size={26} />
              </div>
              <label>
                活动名称
                <input
                  className="text-input"
                  required
                  maxLength={200}
                  value={settings.title}
                  onChange={(e) =>
                    setSettings({ ...settings, title: e.target.value })
                  }
                />
              </label>
              <label>
                品牌 Logo 地址
                <input
                  className="text-input"
                  type="url"
                  placeholder="https://…"
                  value={settings.logoUrl ?? ""}
                  onChange={(e) =>
                    setSettings({ ...settings, logoUrl: e.target.value })
                  }
                />
                <small>支持 HTTP/HTTPS 图片地址，留空使用默认标识。</small>
              </label>
              <label>
                返回直播地址
                <input
                  className="text-input"
                  type="url"
                  placeholder="https://…"
                  value={settings.returnUrl ?? ""}
                  onChange={(e) =>
                    setSettings({ ...settings, returnUrl: e.target.value })
                  }
                />
                <small>留空时，用户端不展示“返回直播”按钮。</small>
              </label>
              <label className="active-toggle">
                <input
                  type="checkbox"
                  checked={settings.active}
                  onChange={(e) =>
                    setSettings({ ...settings, active: e.target.checked })
                  }
                />
                <span>
                  活动开放<small>关闭后暂停公开提问和问题池访问。</small>
                </span>
              </label>
              <div className="settings-footer">
                <span className="muted">活动代码：{settings.code}</span>
                <button className="button primary" disabled={!!busy}>
                  {busy === "settings" ? "保存中…" : "保存配置"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
