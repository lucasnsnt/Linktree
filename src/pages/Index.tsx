import { motion } from "framer-motion";
import { Instagram, Linkedin, Github, Globe, ExternalLink } from "lucide-react";
import avatarImg from "@/assets/avatar.png";

const links = [
  {
    title: "Lucas Santos | Desenvolvedor Web | Portfólio",
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
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-between px-4 py-8">
      {/* Main Content */}
      <motion.div
        className="w-full max-w-[680px] flex flex-col items-center gap-6 flex-1"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Avatar */}
        <motion.div variants={item} className="mt-8">
          <div className="w-36 h-36 rounded-full overflow-hidden border-[2.5px] border-foreground">
            <img
              src={avatarImg}
              alt="Lucas Santos"
              width={144}
              height={144}
              className="w-full h-full object-cover object-center"
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

          {/* Background cursive echo — começa visível, encolhe e some */}
          <div className="lt-echo" aria-hidden="true">
            <span className="lt-echo-text">web developer</span>
          </div>

          {/* Nome principal — surge enquanto o echo some */}
          <div className="lt-name-block">
            <h1 className="lt-name-line">Lucas Santos</h1>
          </div>
        </div>

        {/* Tagline — aparece por último */}
        <div className="text-center">
          <p className="lt-tagline">
            Desenvolvedor web com experiência em Java, Spring Boot, React, Node.js, JavaScript, MySQL. sistemas web.
          </p>
        </div>

        {/* Social Icon */}
        <motion.div variants={item}>
          <a
            href="https://www.instagram.com/lucasnsnt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-accent transition-colors"
            aria-label="Instagram"
          >
            <Instagram className="w-6 h-6" />
          </a>
        </motion.div>

        {/* Links */}
        <motion.div variants={container} className="w-full space-y-3">
          {links.map((link) => (
            <motion.a
              key={link.title}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              variants={item}
              whileHover={{ x: -5, y: -5 }}
              whileTap={{ x: 0, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="brutalist-link flex items-center gap-4 w-full bg-link text-link-foreground px-5 py-4 group"
            >
              <span className="shrink-0">{link.icon}</span>
              <span className="flex-1 text-center font-medium text-sm pr-5">
                {link.title}
              </span>
              <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
            </motion.a>
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
    </div>
  );
};

export default Index;
