"use client";

import type { CSSProperties, ReactNode } from "react";

/** Submit button that asks first. Used for anything irreversible. */
export function ConfirmButton({
  confirm,
  children,
  className = "btn btn-secondary",
  style,
}: {
  confirm: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      type="submit"
      className={className}
      style={style}
      onClick={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
