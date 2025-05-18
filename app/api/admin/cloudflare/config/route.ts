import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// GET: 获取Cloudflare配置
export async function GET() {
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
      select: {
        id: true,
        accountId: true,
        globalKey: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    
    return NextResponse.json(config || {});
  } catch (error) {
    console.error("获取Cloudflare配置失败:", error);
    return NextResponse.json(
      { error: "获取配置失败" },
      { status: 500 }
    );
  }
}

// POST: 保存Cloudflare配置
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "未授权访问" },
        { status: 401 }
      );
    }
    
    const { accountId, globalKey, email } = await req.json();
    
    if (!accountId || !globalKey || !email) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }
    
    // 检查是否已有配置
    const existingConfig = await prisma.cloudflareConfig.findFirst({
      orderBy: { createdAt: "desc" }
    });
    
    let config;
    
    if (existingConfig) {
      // 更新现有配置
      config = await prisma.cloudflareConfig.update({
        where: { id: existingConfig.id },
        data: {
          accountId,
          globalKey,
          email,
        }
      });
    } else {
      // 创建新配置
      config = await prisma.cloudflareConfig.create({
        data: {
          accountId,
          globalKey,
          email,
        }
      });
    }
    
    // 调用Cloudflare API获取域名列表
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones?account.id=${accountId}&page=1&per_page=50`, {
      headers: {
        "X-Auth-Email": email,
        "X-Auth-Key": globalKey,
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
      message: "配置保存成功，已获取域名列表",
      domains: data.result.length,
    });
  } catch (error) {
    console.error("保存Cloudflare配置失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存配置失败" },
      { status: 500 }
    );
  }
} 