"use client";

import Image from "next/image";
import { Camera } from "lucide-react";

export default function DocThumb({ label, url }: { label: string; url: string | null }) {
  if (!url) {
    return (
      <div
        style={{
          borderRadius: "var(--r-sm)",
          background: "var(--surface-2)",
          border: "1px dashed var(--border-strong)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px 4px",
          gap: "4px",
          minHeight: "80px",
        }}
      >
        <span style={{ display: "flex", justifyContent: "center", opacity: 0.4 }}><Camera size={20} /></span>
        <span style={{ fontSize: "10px", color: "var(--text-dim)", textAlign: "center" }}>
          Sin foto
        </span>
        <span style={{ fontSize: "10px", color: "var(--warning)", fontWeight: 600 }}>
          {label}
        </span>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: "block", borderRadius: "var(--r-sm)", overflow: "hidden", position: "relative", aspectRatio: "4/3" }}
    >
      <Image
        src={url}
        alt={label}
        fill
        sizes="150px"
        style={{ objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(transparent, rgba(0,0,0,0.55))",
          padding: "4px 6px",
          fontSize: "10px",
          fontWeight: 600,
          color: "#fff",
        }}
      >
        {label} ↗
      </div>
    </a>
  );
}
