"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role === "DRIVER") router.replace("/driver/dashboard");
    else if (user.role === "ADMIN") router.replace("/admin/dashboard");
    else router.replace("/client/dashboard");
  }, [user, loading, router]);

  return null;
}
