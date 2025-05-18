import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";

import CloudflareConfigForm from "./cloudflare-config-form";
import CloudflareDomainsList from "./cloudflare-domains-list";

export const metadata = constructMetadata({
  title: "Cloudflare 配置 – 域名管理",
  description: "配置 Cloudflare 账号信息和管理域名用途，包括DNS、邮件和短链接服务",
});

export default async function AdminCloudflare() {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="flex flex-col gap-8">
      <DashboardHeader
        heading="Cloudflare 配置"
        text="管理您的 Cloudflare 账号信息和域名用途配置"
      />
      <div className="grid gap-8">
        <CloudflareConfigForm />
        <CloudflareDomainsList />
      </div>
    </div>
  );
} 