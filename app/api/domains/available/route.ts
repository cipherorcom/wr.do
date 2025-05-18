import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// GET: 获取对普通用户可用的域名列表
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "未授权访问" },
        { status: 401 }
      );
    }
    
    // 解析查询参数
    const url = new URL(req.url);
    const serviceType = url.searchParams.get("type"); // dns, email, shorturl
    
    // 构建查询条件
    let whereClause = "";
    if (serviceType === "dns") {
      whereClause = "WHERE use_dns = true";
    } else if (serviceType === "email") {
      whereClause = "WHERE use_emails = true";
    } else if (serviceType === "shorturl") {
      whereClause = "WHERE use_short_url = true";
    }
    
    // 使用原始查询获取域名列表
    const domains = await prisma.$queryRawUnsafe(`
      SELECT 
        id, 
        domain_name, 
        use_dns, 
        use_emails, 
        use_short_url, 
        created_at,
        updated_at
      FROM cloudflare_domains
      ${whereClause}
      ORDER BY domain_name ASC
    `) as any[];
    
    // 过滤掉不需要展示给用户的敏感字段
    const filteredDomains = domains.map(domain => ({
      id: domain.id,
      domainName: domain.domain_name,
      canUseDNS: domain.use_dns,
      canUseEmails: domain.use_emails,
      canUseShortURL: domain.use_short_url
    }));
    
    return NextResponse.json({ 
      domains: filteredDomains,
      total: filteredDomains.length
    });
  } catch (error) {
    console.error("获取可用域名列表失败:", error);
    return NextResponse.json(
      { error: "获取可用域名列表失败" },
      { status: 500 }
    );
  }
} 