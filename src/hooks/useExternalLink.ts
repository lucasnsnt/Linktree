import { useCallback } from "react";
import { openExternalLink } from "@/lib/navigation";

export function useExternalLink() {
  const handleClick = useCallback(
    (url: string, delay?: number, target?: string) =>
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        openExternalLink({ url, delay, target });
      },
    [],
  );

  return { handleClick };
}
