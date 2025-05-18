import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// POST: 刷新Cloudflare域名列表
export async function POST() {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "未授权访问" },
        { status: 401 }
      );
    }
    
    // 获取最新的配置
    const config = await prisma.cloudflareConfig.findFirst({
      orderBy: { createdAt: "desc" },
    });
    
    if (!config) {
      return NextResponse.json(
        { error: "未找到Cloudflare配置" },
        { status: 404 }
      );
    }
    
    // 调用Cloudflare API获取域名列表
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones?account.id=${config.accountId}&page=1&per_page=50`, {
      headers: {
        "X-Auth-Email": config.email,
        "X-Auth-Key": config.globalKey,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error("获取Cloudflare域名列表失败");
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || "Cloudflare API返回错误");
    }
    
    // 保存域名列表
    for (const zone of data.result) {
      // 检查域名是否已存在
      const existingDomain = await prisma.cloudflareDomain.findUnique({
        where: { zoneId: zone.id }
      });
      
      if (existingDomain) {
        // 更新已有域名
        await prisma.cloudflareDomain.update({
          where: { id: existingDomain.id },
          data: {
            domainName: zone.name,
            configId: config.id,
          }
        });
      } else {
        // 创建新域名
        await prisma.cloudflareDomain.create({
          data: {
            domainName: zone.name,
            zoneId: zone.id,
            configId: config.id,
          }
        });
      }
    }
    
    return NextResponse.json({
      message: "域名列表刷新成功",
      domains: data.result.length,
    });
  } catch (error) {
    console.error("刷新Cloudflare域名列表失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "刷新域名列表失败" },
      { status: 500 }
    );
  }
} 