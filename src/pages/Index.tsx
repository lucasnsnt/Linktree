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
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
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
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border shadow-lg">
            <img
              src={avatarImg}
              alt="Lucas Santos"
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>

        {/* Name & Bio */}
        <motion.div variants={item} className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            lucasnsnt
          </h1>
          <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
            Desenvolvedor web com experiência em Java, Spring Boot, React, Node.js,
            JavaScript, MySQL. Criação de sistemas web.
          </p>
        </motion.div>

        {/* Social Icon */}
        <motion.div variants={item}>
          <a
            href="https://www.instagram.com/lucasnsnt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-muted-foreground transition-colors"
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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 w-full bg-link text-link-foreground rounded-xl px-5 py-4 transition-colors hover:bg-link-hover group"
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
        <div className="flex items-center gap-4 text-xs text-footer-foreground">
          <a href="#" className="hover:text-foreground transition-colors">
            Cookie Preferences
          </a>
          <span>•</span>
          <a href="#" className="hover:text-foreground transition-colors">
            Report
          </a>
          <span>•</span>
          <a href="#" className="hover:text-foreground transition-colors">
            Privacy
          </a>
        </div>
        <p className="text-[11px] text-footer-foreground">
          © {new Date().getFullYear()} lucasnsnt
        </p>
      </motion.footer>
    </div>
  );
};

export default Index;
