"use client";
import { useEffect } from "react";

/** Suppresses unhandled AbortErrors caused by mapbox-gl v3 map.remove() */
export default function MapboxAbortSuppressor() {
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      if (e.reason?.name === "AbortError") e.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);
  return null;
}
