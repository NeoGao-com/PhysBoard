"use client";

import { useState, useEffect } from "react";

/**
 * Hook detecting if screen is in portrait orientation or narrow tablet/phone width (< 860px).
 */
export function useWindowOrientation() {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < window.innerHeight || window.innerWidth < 860;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkOrientation = () => {
      const portrait = window.innerWidth < window.innerHeight || window.innerWidth < 860;
      setIsPortrait(portrait);
    };

    checkOrientation();

    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  return isPortrait;
}
