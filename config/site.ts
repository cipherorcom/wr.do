import { SidebarNavItem, SiteConfig } from "types";
import { env } from "@/env.mjs";

const site_url = env.NEXT_PUBLIC_APP_URL;
const open_signup = env.NEXT_PUBLIC_OPEN_SIGNUP;
const short_domains = env.NEXT_PUBLIC_SHORT_DOMAINS || "";
const email_r2_domain = env.NEXT_PUBLIC_EMAIL_R2_DOMAIN || "";

export const siteConfig: SiteConfig = {
  name: "Domains",
  description:
    "Shorten links with analytics, manage emails and control subdomains—all on one platform.",
  url: site_url,
  ogImage: `${site_url}/_static/og.jpg`,
  links: {
    github: "https://github.com/cipherorcom/wr.do",
    telegram: "https://t.me/cipheror_com",
  },
  mailSupport: "support@cipheror.com",
  openSignup: open_signup === "1" ? true : false,
  shortDomains: short_domains.split(","),
  emailDomains: [],
  emailR2Domain: email_r2_domain,
};

export const footerLinks: SidebarNavItem[] = [
  {
    title: "Company",
    items: [
      { title: "About", href: "/docs" },
      { title: "Terms", href: "/terms" },
      { title: "Privacy", href: "/privacy" },
      { title: "Blog", href: "https://blog.cipheror.com" },
    ],
  },
  {
    title: "Products",
    items: [
      { title: "Home", href: "https://cipheror.com" },
    ],
  },
  {
    title: "Docs",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Guide", href: "/docs/quick-start" },
      { title: "Developer", href: "/docs/developer" },
      { title: "Contact", href: "mailto:support@cipheror.com" },
    ],
  },
];
