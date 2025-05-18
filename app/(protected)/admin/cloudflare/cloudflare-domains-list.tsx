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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center">
        <div>
          <CardTitle>域名列表</CardTitle>
          <CardDescription>
            从Cloudflare账号中获取的域名列表
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
      <CardContent>
        {isLoading ? (
          <Table>
            <TableHeader className="bg-gray-100/50 dark:bg-primary-foreground">
              <TableRow>
                <TableHead>域名</TableHead>
                <TableHead>Zone ID</TableHead>
                <TableHead>添加时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCellSkeleton />
                <TableCellSkeleton />
                <TableCellSkeleton />
              </TableRow>
              <TableRow>
                <TableCellSkeleton />
                <TableCellSkeleton />
                <TableCellSkeleton />
              </TableRow>
              <TableRow>
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
          <Table>
            <TableHeader className="bg-gray-100/50 dark:bg-primary-foreground">
              <TableRow className="grid grid-cols-3 items-center">
                <TableHead className="col-span-1 font-bold">域名</TableHead>
                <TableHead className="col-span-1 font-bold">Zone ID</TableHead>
                <TableHead className="col-span-1 font-bold">添加时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.domains.map((domain) => (
                <TableRow
                  key={domain.id}
                  className="grid animate-fade-in grid-cols-3 items-center animate-in"
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
                  <TableCell className="col-span-1 truncate">
                    <TooltipProvider>
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger className="truncate">
                          {domain.zoneId}
                        </TooltipTrigger>
                        <TooltipContent>
                          {domain.zoneId}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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