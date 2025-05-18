import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";

import CloudflareConfigForm from "./cloudflare-config-form";
import CloudflareDomainsList from "./cloudflare-domains-list";

export const metadata = constructMetadata({
  title: "Cloudflare 配置 – Domains",
  description: "配置 Cloudflare 账号信息和查看域名列表",
});

export default async function CloudflarePage() {
  const user = await getCurrentUser();
  if (!user || !user?.id) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <>
      <DashboardHeader
        heading="Cloudflare 配置"
        text="配置 Cloudflare 账号信息和查看域名列表"
      />
      <div className="grid gap-6">
        <CloudflareConfigForm />
        <CloudflareDomainsList />
      </div>
    </>
  );
} 