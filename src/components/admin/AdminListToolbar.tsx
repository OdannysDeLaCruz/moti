"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

interface FilterChip {
  key: string;
  label: string;
}

interface AdminListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  chips?: FilterChip[];
  activeChip?: string;
  onChipChange?: (key: string) => void;
}

export default function AdminListToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  chips,
  activeChip,
  onChipChange,
}: AdminListToolbarProps) {
  const [input, setInput] = useState(searchValue);

  useEffect(() => {
    const t = setTimeout(() => onSearchChange(input), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
      <div style={{ position: "relative" }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={searchPlaceholder}
          style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: "var(--r-md)", border: "1.5px solid var(--border)", fontSize: "14px" }}
        />
      </div>
      {chips && chips.length > 0 && (
        <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
          {chips.map((c) => (
            <button
              key={c.key}
              className={`chip${activeChip === c.key ? " selected" : ""}`}
              onClick={() => onChipChange?.(c.key)}
              style={{ flexShrink: 0 }}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
