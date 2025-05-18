import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// GET: 获取Cloudflare域名列表
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
      include: {
        domains: true,
      }
    });
    
    return NextResponse.json({
      domains: config?.domains || [],
    });
  } catch (error) {
    console.error("获取Cloudflare域名列表失败:", error);
    return NextResponse.json(
      { error: "获取域名列表失败" },
      { status: 500 }
    );
  }
} 