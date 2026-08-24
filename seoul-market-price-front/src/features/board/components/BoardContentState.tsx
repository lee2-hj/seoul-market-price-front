import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type BoardContentStateType = "loading" | "error" | "empty";

interface BoardContentStateProps {
  state: BoardContentStateType;
  message?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export default function BoardContentState({
  state,
  message,
  action,
  children,
  className,
}: BoardContentStateProps) {
  return (
    <div
      className={cn(
        "text-center text-[14px]",
        state === "error" ? "text-rose-500" : "text-[#6B7280]",
        className,
      )}
    >
      {children ?? message}
      {action}
    </div>
  );
}
