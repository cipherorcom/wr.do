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
    
    // 使用原始SQL查询获取最新配置和域名
    const configs = await prisma.$queryRawUnsafe(`
      SELECT * FROM cloudflare_configs 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (!configs || !configs[0]) {
      return NextResponse.json({
        domains: [],
      });
    }
    
    const config = configs[0];
    
    // 获取域名列表
    const domains = await prisma.$queryRawUnsafe(`
      SELECT 
        id, 
        domain_name AS "domainName", 
        zone_id AS "zoneId", 
        config_id AS "configId", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt", 
        use_dns AS "useDNS", 
        use_emails AS "useEmails", 
        use_short_url AS "useShortURL"
      FROM cloudflare_domains 
      WHERE config_id = $1
    `, config.id);
    
    return NextResponse.json({
      domains: domains || [],
    });
  } catch (error) {
    console.error("获取Cloudflare域名列表失败:", error);
    return NextResponse.json(
      { error: "获取域名列表失败" },
      { status: 500 }
    );
  }
} 