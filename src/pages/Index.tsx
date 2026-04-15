import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Instagram, Linkedin, Github, Globe, ExternalLink as ExternalLinkIcon } from "lucide-react";
import avatarImg from "@/assets/avatar.webp";
import { ExternalLink } from "@/components/ExternalLink";
import { isInAppBrowser } from "@/lib/browser";

const MotionExternalLink = motion.create(ExternalLink);

const links = [
  {
    title: "Portfólio | Lucas Santos - Dev",
    url: "http://lucasnsnt.ink/",
    icon: <Globe className="w-5 h-5" />,
    description: "Portfólio pessoal",
  },
  {
    title: "LinkedIn",
    url: "https://www.linkedin.com/in/lucasnsnt/",
    icon: <Linkedin className="w-5 h-5" />,
  },
  {
    title: "Github",
    url: "https://github.com/lucasnsnt/",
    icon: <Github className="w-5 h-5" />,
  },
  {
    title: "Instagram",
    url: "https://www.instagram.com/lucasnsnt",
    icon: <Instagram className="w-5 h-5" />,
    featured: true,
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const Index = () => {
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateCanHover = () => setCanHover(mediaQuery.matches);

    updateCanHover();
    mediaQuery.addEventListener("change", updateCanHover);

    return () => mediaQuery.removeEventListener("change", updateCanHover);
  }, []);

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-between px-4 py-8">
      {/* Main Content */}
      <motion.div
        className="w-full max-w-[680px] flex flex-col items-center gap-6 flex-1"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-8"
        >
          <div className="w-36 h-36 rounded-full overflow-hidden border-[2.5px] border-foreground">
            <img
              src={avatarImg}
              alt="Lucas Santos"
              width={144}
              height={144}
              draggable={false}
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover object-center pointer-events-none select-none"
            />
          </div>
        </motion.div>

        {/* Name Hero Block — echo + warp SVG + reveal animation */}
        <div className="lt-hero w-full">
          {/* SVG warp filter — liquid turbulence distortion */}
          <svg className="lt-filters" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="lt-warp" x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence
                  type="turbulence"
                  baseFrequency="0.012 0.018"
                  numOctaves="3"
                  seed="4"
                  result="noise"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale="10"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>
          </svg>

          
          <div className="lt-echo" aria-hidden="true">
            <span className="lt-echo-text">web developer</span>
          </div>

          
          <div className="lt-name-block">
            <h1 className="lt-name-line">Lucas Santos</h1>
          </div>
        </div>

        
        <div className="text-center">
          <p className="lt-tagline">
            Desenvolvedor web com experiência em Java, Spring Boot, React, Node.js, JavaScript, MySQL. sistemas web.
          </p>
        </div>

        {/* WebView Banner */}
        {isInAppBrowser() && (
          <motion.div
            variants={item}
            className="w-full bg-muted/60 border border-border px-4 py-2.5 text-center text-xs text-muted-foreground"
          >
            Para uma melhor experiência,{" "}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
              }}
              className="underline font-medium text-foreground"
              aria-label="Copiar link da página"
            >
              copie o link
            </button>{" "}
            e abra no navegador.
          </motion.div>
        )}

        {/* Social Icon */}
        <motion.div variants={item}>
          <ExternalLink
            url="https://www.instagram.com/lucasnsnt"
            className={`text-foreground transition-colors ${canHover ? "hover:text-accent" : ""}`}
            aria-label="Instagram"
          >
            <Instagram className="w-6 h-6" />
          </ExternalLink>
        </motion.div>

        {/* Links */}
        <motion.div variants={container} className="w-full space-y-3">
          {links.map((link) => (
            <MotionExternalLink
              key={link.title}
              url={link.url}
              variants={item}
              whileHover={canHover ? { x: -5, y: -5 } : undefined}
              whileTap={{ x: 0, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`brutalist-link flex items-center gap-4 w-full bg-link text-link-foreground px-5 py-4 ${canHover ? "group" : ""}`}
              aria-label={link.title}
            >
              <span className="shrink-0">{link.icon}</span>
              <span className="flex-1 text-center font-medium text-sm pr-5">
                {link.title}
              </span>
              <ExternalLinkIcon className={`w-4 h-4 opacity-0 transition-opacity shrink-0 ${canHover ? "group-hover:opacity-60" : ""}`} />
            </MotionExternalLink>
          ))}
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-12 pb-4 flex flex-col items-center gap-3"
      >
        
        <p className="text-[11px] text-footer-foreground">
          © {new Date().getFullYear()} Lucas Santos. Todos os direitos reservados.
        </p>
      </motion.footer>
    </main>
  );
};

export default Index;
