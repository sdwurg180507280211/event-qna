import { Icon } from "./Icon";
export function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = Math.max(1, Math.min(page - 1, pages - 2));
  return (
    <nav className="pagination" aria-label="分页">
      <span className="page-total">共 {total} 条</span>
      <button
        aria-label="上一页"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <Icon
          name="chevron"
          size={16}
          style={{ transform: "rotate(180deg)" }}
        />
      </button>
      {Array.from({ length: Math.min(3, pages) }, (_, i) => start + i).map(
        (n) => (
          <button
            key={n}
            className={n === page ? "active" : ""}
            aria-current={n === page ? "page" : undefined}
            aria-label={`第 ${n} 页`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ),
      )}
      <button
        aria-label="下一页"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        <Icon name="chevron" size={16} />
      </button>
      <span>
        第 {page} / {pages} 页
      </span>
    </nav>
  );
}
