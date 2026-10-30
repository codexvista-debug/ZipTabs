"use client";

import React, { useState, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  children: React.ReactNode;
}

export function PullToRefresh({ children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isPullingRef = useRef(false);
  const PULL_THRESHOLD = 60;

  useEffect(() => {
    let startY = 0;
    let startX = 0;
    let isTracking = false;

    // Detect if the touch target or any parent scroll container is scrolled down
    const getScrollTop = (element: HTMLElement | null): number => {
      let el = element;
      while (el && el !== document.body) {
        if (el.scrollTop > 0) return el.scrollTop;
        el = el.parentElement;
      }
      return window.scrollY || 0;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return;
      const target = e.target as HTMLElement | null;
      const currentScrollTop = getScrollTop(target);

      // Only initiate pull-to-refresh if user is at the very top of the scroll container
      if (currentScrollTop <= 0) {
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
        isTracking = true;
      } else {
        isTracking = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTracking || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = currentY - startY;
      const diffX = Math.abs(currentX - startX);

      // Ignore horizontal gestures (swiping tabs, carousel, etc.)
      if (diffX > diffY) {
        isTracking = false;
        return;
      }

      if (diffY > 0) {
        // Natural tactile resistance damping
        const damped = Math.min(95, diffY * 0.42);
        setPullDistance(damped);
        isPullingRef.current = true;

        if (damped > 12 && e.cancelable) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
        isPullingRef.current = false;
      }
    };

    const handleTouchEnd = () => {
      if (!isTracking) return;
      isTracking = false;

      setPullDistance((current) => {
        if (current >= PULL_THRESHOLD) {
          setIsRefreshing(true);
          // Smooth vibration if supported
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            try {
              navigator.vibrate(15);
            } catch {}
          }
          // Reload page
          setTimeout(() => {
            window.location.reload();
          }, 350);
          return PULL_THRESHOLD;
        }
        return 0;
      });
      isPullingRef.current = false;
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isRefreshing]);

  const progress = Math.min(1, pullDistance / PULL_THRESHOLD);

  return (
    <>
      {/* Pull-To-Refresh Visual Indicator (Mobile Only) */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          style={{
            transform: `translate(-50%, ${Math.max(12, pullDistance - 20)}px)`,
            opacity: Math.min(1, pullDistance / 20),
          }}
          className="fixed left-1/2 top-0 z-[100] transition-transform duration-75 pointer-events-none select-none lg:hidden"
        >
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0c1427]/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl text-white">
            <RefreshCw
              style={{
                transform: `rotate(${isRefreshing ? 0 : progress * 360}deg)`,
              }}
              className={`w-3.5 h-3.5 text-blue-400 ${
                isRefreshing ? "animate-spin" : "transition-transform"
              }`}
            />
            <span className="text-xs font-bold tracking-tight">
              {isRefreshing
                ? "Refreshing..."
                : pullDistance >= PULL_THRESHOLD
                ? "Release to refresh"
                : "Pull to refresh"}
            </span>
          </div>
        </div>
      )}

      {children}
    </>
  );
}
