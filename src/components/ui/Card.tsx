import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  animate?: boolean;
  onClick?: () => void;
}

export default function Card({
  children,
  className = "",
  glass = false,
  animate = false,
  onClick,
}: CardProps) {
  return (
    <div
      className={[
        glass ? "card-glass" : "card",
        animate ? "animate-slide-up" : "",
        onClick ? "cursor-pointer" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      {children}
    </div>
  );
}
