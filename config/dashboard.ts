import { UserRole } from "@prisma/client";

import { SidebarNavItem } from "types";

import { siteConfig } from "./site";

export const sidebarLinks: SidebarNavItem[] = [
  {
    title: "MENU",
    items: [
      { href: "/dashboard", icon: "dashboard", title: "Dashboard" },
      { href: "/dashboard/urls", icon: "link", title: "Short Urls" },
      { href: "/emails", icon: "mail", title: "Emails" },
      { href: "/dashboard/records", icon: "globeLock", title: "DNS Records" },
      { href: "/chat", icon: "messages", title: "WRoom" },
    ],
  },
  {
    title: "SCRAPE",
    items: [
      {
        href: "/dashboard/scrape",
        icon: "bug",
        title: "Overview",
      },
      {
        href: "/dashboard/scrape/screenshot",
        icon: "camera",
        title: "Screenshot",
      },
      {
        href: "/dashboard/scrape/qrcode",
        icon: "qrcode",
        title: "QR Code",
      },
      {
        href: "/dashboard/scrape/meta-info",
        icon: "globe",
        title: "Meta Info",
      },
      {
        href: "/dashboard/scrape/markdown",
        icon: "fileText",
        title: "Markdown",
      },
    ],
  },
  {
    title: "ADMIN",
    items: [
      {
        href: "/admin",
        icon: "laptop",
        title: "Admin Panel",
        authorizeOnly: UserRole.ADMIN,
      },
      {
        href: "/admin/users",
        icon: "users",
        title: "Users",
        authorizeOnly: UserRole.ADMIN,
      },
      {
        href: "/admin/urls",
        icon: "link",
        title: "URLs",
        authorizeOnly: UserRole.ADMIN,
      },
      {
        href: "/admin/records",
        icon: "globe",
        title: "Records",
        authorizeOnly: UserRole.ADMIN,
      },
      {
        href: "/admin/cloudflare",
        icon: "globeLock",
        title: "Domains",
        authorizeOnly: UserRole.ADMIN,
      },
    ],
  },
  {
    title: "OPTIONS",
    items: [
      { href: "/dashboard/settings", icon: "settings", title: "Settings" },
      { href: "/docs", icon: "bookOpen", title: "Documentation" },
      {
        href: "mailto:" + siteConfig.mailSupport,
        icon: "mail",
        title: "Support",
      },
    ],
  },
];
