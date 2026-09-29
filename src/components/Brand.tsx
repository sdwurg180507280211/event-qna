"use client";
import { useState } from "react";
import { Icon } from "./Icon";
export function Brand({
  title = "Event Q&A",
  logoUrl,
}: {
  title?: string;
  logoUrl?: string | null;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <div className="brand-lockup">
      {logoUrl && failed !== logoUrl ? (
        <img
          className="brand-logo"
          src={logoUrl}
          alt={title}
          referrerPolicy="no-referrer"
          onError={() => setFailed(logoUrl)}
        />
      ) : (
        <span className="brand-symbol">
          <Icon name="chat" size={24} />
        </span>
      )}
      <span>
        <strong>{title}</strong>
        <small>让每一个问题，都被听见</small>
      </span>
    </div>
  );
}
