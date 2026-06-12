"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function UpdateButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    try {
      const response = await fetch("/api/refresh", {
        method: "POST",
      });

      if (!response.ok) {
        setError("更新に失敗しました");
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("更新に失敗しました");
    }
  }

  return (
    <div className="update-actions">
      <button
        className="update-button"
        disabled={isPending}
        onClick={() => {
          void handleClick();
        }}
        type="button"
      >
        {isPending ? "更新中..." : "更新"}
      </button>
      {error ? <p className="update-error">{error}</p> : null}
    </div>
  );
}
