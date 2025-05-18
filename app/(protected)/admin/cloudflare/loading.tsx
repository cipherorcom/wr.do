import { DashboardHeader } from "@/components/dashboard/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function CloudflareLoading() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <DashboardHeader
        heading="Cloudflare 配置"
        text="配置 Cloudflare 账号信息和查看域名列表"
      />
      <div className="grid gap-6">
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  );
} 