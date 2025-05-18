import { NextResponse } from "next/server";
import crypto from "crypto";

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
    
    // 使用原始SQL查询获取最新配置
    const configs = await prisma.$queryRawUnsafe(`
      SELECT * FROM cloudflare_configs 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (!configs || !configs[0]) {
      return NextResponse.json(
        { error: "未找到Cloudflare配置" },
        { status: 404 }
      );
    }
    
    const config = configs[0];
    
    // 调用Cloudflare API获取域名列表
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones?account.id=${config.account_id}&page=1&per_page=50`, {
      headers: {
        "X-Auth-Email": config.email,
        "X-Auth-Key": config.global_key,
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
      // 使用事务处理每个域名的更新
      await prisma.$transaction(async (tx) => {
        // 检查域名是否已存在
        const domains = await tx.$queryRawUnsafe(
          `SELECT * FROM cloudflare_domains WHERE zone_id = $1`,
          zone.id
        );
        
        if (domains && Array.isArray(domains) && domains.length > 0) {
          const existingDomain = domains[0];
          // 更新已有域名，保留用途设置
          await tx.$executeRawUnsafe(
            `UPDATE cloudflare_domains 
             SET domain_name = $1, config_id = $2 
             WHERE id = $3`,
            zone.name,
            config.id,
            existingDomain.id
          );
        } else {
          // 创建新域名，默认所有用途都不启用
          await tx.$executeRawUnsafe(
            `INSERT INTO cloudflare_domains 
             (id, domain_name, zone_id, config_id, created_at, updated_at, use_dns, use_emails, use_short_url) 
             VALUES ($1, $2, $3, $4, NOW(), NOW(), false, false, false)`,
            crypto.randomUUID(), // 生成新的UUID
            zone.name,
            zone.id,
            config.id
          );
        }
      });
    }
    
    return NextResponse.json({
      message: "域名列表已刷新",
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