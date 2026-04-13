import { forwardRef, type AnchorHTMLAttributes } from "react";
import { useExternalLink } from "@/hooks/useExternalLink";
import { isInAppBrowser } from "@/lib/browser";

interface ExternalLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target"> {
  url: string;
  delay?: number;
}

const ExternalLink = forwardRef<HTMLAnchorElement, ExternalLinkProps>(
  ({ url, delay, children, onClick, ...props }, ref) => {
    const { handleClick } = useExternalLink();

    const inApp = isInAppBrowser();

    return (
      <a
        ref={ref}
        href={url}
        target={inApp ? undefined : "_blank"}
        rel={inApp ? undefined : "noopener noreferrer"}
        onClick={(e) => {
          handleClick(url, delay)(e);
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
