import { useCallback } from "react";
import { openExternalLink } from "@/lib/navigation";

export function useExternalLink() {
  const handleClick = useCallback(
    (url: string, delay?: number) =>
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        openExternalLink({ url, delay });
      },
    [],
  );

  return { handleClick };
}
