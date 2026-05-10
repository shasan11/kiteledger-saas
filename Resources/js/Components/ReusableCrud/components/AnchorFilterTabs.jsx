import React from "react";
import { EMPTY_ARRAY } from "../constants";

export default function AnchorFilterTabs({ items = EMPTY_ARRAY, activeKey, onChange, leftTitle, rightNode }) {
  const activeItem = items.find((x) => x.key === activeKey);

  return (
    <div
      className="bg-white"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 15,
        padding: "10px 10px",
        borderBottom: "1px solid #eef0f4",

      }}
    >
      <div style={{ fontSize: 18, fontWeight: 650, color: "#0f172a" }}>
        {activeItem?.title || leftTitle || ""}
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 26, marginLeft: 24 }}>
        {items.map((it) => {
          const isActive = it.key === activeKey;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onChange?.(it.key)}
              style={{
                appearance: "none",
                background: "transparent",
                border: "none",
                padding: "0px 4px",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#0f172a" : "#64748b",
                position: "relative",
              }}
            >
              {it.label}
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: -13,
                    height: 4,
                    background: '#04a94a',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {rightNode ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{rightNode}</div>
      ) : null}
    </div>
  );
}

