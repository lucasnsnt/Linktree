import { forwardRef, type AnchorHTMLAttributes } from "react";
import { useExternalLink } from "@/hooks/useExternalLink";
import { isInAppBrowser } from "@/lib/browser";

interface ExternalLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target"> {
  url: string;
  delay?: number;
  target?: string;
}

const ExternalLink = forwardRef<HTMLAnchorElement, ExternalLinkProps>(
  ({ url, delay, target, children, onClick, ...props }, ref) => {
    const { handleClick } = useExternalLink();

    const inApp = isInAppBrowser();
    const resolvedTarget = target ?? (inApp ? undefined : "_blank");
    const resolvedRel = resolvedTarget === "_blank" ? "noopener noreferrer" : undefined;

    return (
      <a
        ref={ref}
        href={url}
        target={resolvedTarget}
        rel={resolvedRel}
        onClick={(e) => {
          handleClick(url, delay, resolvedTarget)(e);
          onClick?.(e);
        }}
        {...props}
      >
        {children}
      </a>
    );
  },
);

ExternalLink.displayName = "ExternalLink";

export { ExternalLink };
export type { ExternalLinkProps };
