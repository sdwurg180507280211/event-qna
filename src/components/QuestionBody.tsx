"use client";
import { useEffect, useRef, useState } from "react";
export function QuestionBody({ content }: { content: string }) {
  const element = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const node = element.current;
    if (!node || expanded) return;
    const measure = () =>
      setOverflows(node.scrollHeight > node.clientHeight + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    return () => observer.disconnect();
  }, [content, expanded]);
  return (
    <>
      <p ref={element} className={expanded ? "" : "clamped"}>
        {content}
      </p>
      {(overflows || expanded) && (
        <button
          className="text-button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "收起" : "查看全部"}
        </button>
      )}
    </>
  );
}
