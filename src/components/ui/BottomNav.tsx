"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bike, User, Home, ClipboardList, LayoutDashboard, CheckSquare, Settings } from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  "🏍️": <Bike size={22} />,
  "👤": <User size={22} />,
  "🏠": <Home size={22} />,
  "📋": <ClipboardList size={22} />,
  "📊": <LayoutDashboard size={22} />,
  "✅": <CheckSquare size={22} />,
  "⚙️": <Settings size={22} />,
};

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface BottomNavProps {
  items: NavItem[];
}

export default function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item${isActive ? " active" : ""}`}
          >
            {ICON_MAP[item.icon] ?? <span style={{ fontSize: "1.375rem" }}>{item.icon}</span>}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
