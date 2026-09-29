"use client";
import { useEffect, useRef, useState } from "react";

export function QuestionBody({ content }: { content: string }) {
  const container = useRef<HTMLDivElement>(null);
  const element = useRef<HTMLParagraphElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [lines, setLines] = useState(4);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const node = container.current;
    const paragraph = element.current;
    if (!node || !paragraph) return;
    const measure = () => {
      const desktop = window.matchMedia("(min-width: 851px)").matches;
      const lineHeight = parseFloat(getComputedStyle(paragraph).lineHeight);
      setLines(
        desktop
          ? Math.max(1, Math.floor((node.clientHeight - 38) / lineHeight))
          : 4,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const measure = () =>
      setOverflows(node.scrollHeight > node.clientHeight + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    return () => observer.disconnect();
  }, [content, lines]);

  return (
    <div ref={container} className="question-body">
      <p ref={element} className="clamped" style={{ WebkitLineClamp: lines }}>
        {content}
      </p>
      <div className="question-body-action">
        {overflows && (
          <button
            className="text-button"
            onClick={() => dialog.current?.showModal()}
          >
            查看全文
          </button>
        )}
      </div>
      <dialog
        ref={dialog}
        className="question-dialog"
        aria-label="问题全文"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="question-dialog-content">
          <div className="section-heading">
            <h2>问题全文</h2>
            <button
              className="button ghost small"
              onClick={() => dialog.current?.close()}
            >
              关闭
            </button>
          </div>
          <p>{content}</p>
        </div>
      </dialog>
    </div>
  );
}
