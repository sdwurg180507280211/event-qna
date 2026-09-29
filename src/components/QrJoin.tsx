"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrJoin({ eventId }: { eventId: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    const url = `${window.location.origin}/event/${encodeURIComponent(eventId)}`;
    QRCode.toDataURL(url, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then(setSrc)
      .catch((error) => console.error("QR generation failed", error));
  }, [eventId]);

  return (
    <aside className="qr-card">
      <div className="qr-box">
        {src ? (
          <img src={src} alt="手机扫码参与提问" />
        ) : (
          <div className="qr-placeholder" />
        )}
      </div>
      <div>
        <strong>手机扫码参与提问</strong>
        <p>扫码即可匿名提问</p>
      </div>
    </aside>
  );
}
