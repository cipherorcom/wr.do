import { NextResponse } from "next/server";
import crypto from "crypto";

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
    
    // 使用原始SQL查询获取最新配置
    const configs = await prisma.$queryRawUnsafe(`
      SELECT 
        id, 
        account_id AS "accountId", 
        global_key AS "globalKey", 
        email, 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM cloudflare_configs 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    return NextResponse.json(configs?.[0] || {});
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
    
    // 使用原始SQL查询获取最新配置
    const configs = await prisma.$queryRawUnsafe(`
      SELECT * FROM cloudflare_configs 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    let configId;
    
    if (configs && configs[0]) {
      // 更新现有配置
      await prisma.$executeRawUnsafe(`
        UPDATE cloudflare_configs
        SET account_id = $1, global_key = $2, email = $3, updated_at = NOW()
        WHERE id = $4
      `, accountId, globalKey, email, configs[0].id);
      
      configId = configs[0].id;
    } else {
      // 创建新配置
      const newId = crypto.randomUUID();
      await prisma.$executeRawUnsafe(`
        INSERT INTO cloudflare_configs (id, account_id, global_key, email, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
      `, newId, accountId, globalKey, email);
      
      configId = newId;
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
      const domains = await prisma.$queryRawUnsafe(`
        SELECT * FROM cloudflare_domains WHERE zone_id = $1
      `, zone.id);
      
      if (domains && domains[0]) {
        // 更新已有域名
        await prisma.$executeRawUnsafe(`
          UPDATE cloudflare_domains
          SET domain_name = $1, config_id = $2, updated_at = NOW()
          WHERE id = $3
        `, zone.name, configId, domains[0].id);
      } else {
        // 创建新域名，默认禁用所有用途
        await prisma.$executeRawUnsafe(`
          INSERT INTO cloudflare_domains 
          (id, domain_name, zone_id, config_id, created_at, updated_at, use_dns, use_emails, use_short_url)
          VALUES ($1, $2, $3, $4, NOW(), NOW(), false, false, false)
        `, crypto.randomUUID(), zone.name, zone.id, configId);
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