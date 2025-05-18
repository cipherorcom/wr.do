"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import useSWR from "swr";
import { z } from "zod";

import { fetcher } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Icons } from "@/components/shared/icons";

interface CloudflareConfig {
  id?: string;
  accountId: string;
  globalKey: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

const formSchema = z.object({
  accountId: z.string().min(1, { message: "请输入 Cloudflare Account ID" }),
  globalKey: z.string().min(1, { message: "请输入 Cloudflare Global API Key" }),
  email: z.string().email({ message: "请输入有效的邮箱地址" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function CloudflareConfigForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const { data, isLoading: isDataLoading, mutate } = useSWR<CloudflareConfig>(
    "/api/admin/cloudflare/config",
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: "",
      globalKey: "",
      email: "",
    },
    values: {
      accountId: data?.accountId || "",
      globalKey: data?.globalKey || "",
      email: data?.email || "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/cloudflare/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "保存配置失败");
      }

      toast({
        title: "配置保存成功",
        description: "Cloudflare 配置已保存，并已获取域名列表",
      });

      // 刷新数据
      mutate();
      router.refresh();
    } catch (error: any) {
      toast({
        title: "配置保存失败",
        description: error.message || "保存 Cloudflare 配置时出错",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cloudflare 配置</CardTitle>
        <CardDescription>
          配置您的 Cloudflare 账号信息，用于管理域名和DNS记录
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account ID</FormLabel>
                  <FormControl>
                    <Input placeholder="输入 Cloudflare Account ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="globalKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Global API Key</FormLabel>
                  <FormControl>
                    <Input 
                      type="password"
                      placeholder="输入 Cloudflare Global API Key" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>邮箱</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="输入 Cloudflare 账号邮箱" 
                      type="email"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || isDataLoading}>
              {isLoading && (
                <Icons.spinner className="mr-2 size-4 animate-spin" />
              )}
              保存配置
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
} 