"use client";

import { useState } from "react";
import { RefreshCwIcon } from "lucide-react";
import useSWR from "swr";

import { fetcher, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import { Icons } from "@/components/shared/icons";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";

interface CloudflareDomain {
  id: string;
  domainName: string;
  zoneId: string;
  configId: string;
  createdAt: string;
  updatedAt: string;
  useDNS: boolean;
  useEmails: boolean;
  useShortURL: boolean;
}

function TableCellSkeleton() {
  return (
    <TableCell>
      <Skeleton className="h-5 w-full" />
    </TableCell>
  );
}

export default function CloudflareDomainsList() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingDomain, setUpdatingDomain] = useState<string | null>(null);
  
  const { data, isLoading, mutate } = useSWR<{domains: CloudflareDomain[]}>("/api/admin/cloudflare/domains", fetcher, {
    revalidateOnFocus: false,
  });

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch("/api/admin/cloudflare/domains/refresh", {
        method: "POST",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "刷新域名列表失败");
      }
      
      toast({
        title: "域名列表已刷新",
        description: "成功从Cloudflare获取最新域名列表",
      });
      
      // 刷新数据
      mutate();
    } catch (error: any) {
      toast({
        title: "刷新失败",
        description: error.message || "刷新域名列表时出错",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateDomainUsage = async (domainId: string, field: 'useDNS' | 'useEmails' | 'useShortURL', value: boolean) => {
    try {
      setUpdatingDomain(domainId);
      
      const response = await fetch(`/api/admin/cloudflare/domains/${domainId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [field]: value
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "更新域名用途失败");
      }
      
      toast({
        title: "域名用途已更新",
        description: "域名配置已成功保存",
      });
      
      // 乐观更新UI
      mutate(
        data => ({
          domains: data?.domains.map(domain => 
            domain.id === domainId 
              ? { ...domain, [field]: value }
              : domain
          ) || []
        }),
        false
      );
      
      // 然后获取最新数据
      mutate();
    } catch (error: any) {
      toast({
        title: "更新失败",
        description: error.message || "更新域名用途时出错",
        variant: "destructive",
      });
    } finally {
      setUpdatingDomain(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center">
        <div>
          <CardTitle>域名管理</CardTitle>
          <CardDescription>
            管理Cloudflare域名的用途配置，包括DNS、邮件和短链接服务
          </CardDescription>
        </div>
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
          >
            {(isLoading || isRefreshing) ? (
              <RefreshCwIcon className="size-4 animate-spin" />
            ) : (
              <RefreshCwIcon className="size-4" />
            )}
            <span className="ml-2">刷新列表</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <Table className="pt-2">
            <TableHeader className="bg-gray-100/50 dark:bg-primary-foreground py-4">
              <TableRow className="py-3">
                <TableHead className="py-3">域名</TableHead>
                <TableHead className="py-3">DNS</TableHead>
                <TableHead className="py-3">邮件</TableHead>
                <TableHead className="py-3">短链接</TableHead>
                <TableHead className="py-3">添加时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCellSkeleton />
                <TableCellSkeleton />
                <TableCellSkeleton />
                <TableCellSkeleton />
                <TableCellSkeleton />
              </TableRow>
              <TableRow>
                <TableCellSkeleton />
                <TableCellSkeleton />
                <TableCellSkeleton />
                <TableCellSkeleton />
                <TableCellSkeleton />
              </TableRow>
              <TableRow>
                <TableCellSkeleton />
                <TableCellSkeleton />
                <TableCellSkeleton />
                <TableCellSkeleton />
                <TableCellSkeleton />
              </TableRow>
            </TableBody>
          </Table>
        ) : !data?.domains || data.domains.length === 0 ? (
          <EmptyPlaceholder>
            <EmptyPlaceholder.Icon name="globe">
              <Icons.globe className="size-8" />
            </EmptyPlaceholder.Icon>
            <EmptyPlaceholder.Title>暂无域名</EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              尚未从Cloudflare获取到任何域名，请先配置Cloudflare账号信息并保存。
            </EmptyPlaceholder.Description>
          </EmptyPlaceholder>
        ) : (
          <Table className="pt-2">
            <TableHeader className="bg-gray-100/50 dark:bg-primary-foreground py-4">
              <TableRow className="grid grid-cols-5 items-center py-3">
                <TableHead className="col-span-1 font-bold py-3">域名</TableHead>
                <TableHead className="col-span-1 font-bold text-center py-3">DNS 管理</TableHead>
                <TableHead className="col-span-1 font-bold text-center py-3">邮件服务</TableHead>
                <TableHead className="col-span-1 font-bold text-center py-3">短链接服务</TableHead>
                <TableHead className="col-span-1 font-bold py-3">添加时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.domains.map((domain) => (
                <TableRow
                  key={domain.id}
                  className="grid animate-fade-in grid-cols-5 items-center animate-in h-14"
                >
                  <TableCell className="col-span-1 truncate">
                    <TooltipProvider>
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger className="truncate">
                          {domain.domainName}
                        </TooltipTrigger>
                        <TooltipContent>
                          {domain.domainName}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="col-span-1 text-center">
                    <div className="flex items-center justify-center">
                      <Switch
                        checked={domain.useDNS}
                        disabled={updatingDomain === domain.id}
                        onCheckedChange={(checked) => 
                          updateDomainUsage(domain.id, 'useDNS', checked)
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell className="col-span-1 text-center">
                    <div className="flex items-center justify-center">
                      <Switch
                        checked={domain.useEmails}
                        disabled={updatingDomain === domain.id}
                        onCheckedChange={(checked) => 
                          updateDomainUsage(domain.id, 'useEmails', checked)
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell className="col-span-1 text-center">
                    <div className="flex items-center justify-center">
                      <Switch
                        checked={domain.useShortURL}
                        disabled={updatingDomain === domain.id}
                        onCheckedChange={(checked) => 
                          updateDomainUsage(domain.id, 'useShortURL', checked)
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell className="col-span-1">
                    {timeAgo(new Date(domain.createdAt))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
} 