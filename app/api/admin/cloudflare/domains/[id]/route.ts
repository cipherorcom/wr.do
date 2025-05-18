import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// 定义请求体的验证模式
const updateDomainSchema = z.object({
  useDNS: z.boolean().optional(),
  useEmails: z.boolean().optional(),
  useShortURL: z.boolean().optional(),
});

export type UpdateDomainPayload = z.infer<typeof updateDomainSchema>;

// PATCH: 更新域名用途
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "未授权访问" },
        { status: 401 }
      );
    }
    
    const domainId = params.id;
    
    // 使用直接数据库操作
    const body = await req.json();
    const validatedData = updateDomainSchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json(
        { error: "无效的请求数据", details: validatedData.error.format() },
        { status: 400 }
      );
    }
    
    // 构建更新数据
    const updateData: Record<string, any> = {};
    
    if (validatedData.data.useDNS !== undefined) {
      updateData.use_dns = validatedData.data.useDNS;
    }
    
    if (validatedData.data.useEmails !== undefined) {
      updateData.use_emails = validatedData.data.useEmails;
    }
    
    if (validatedData.data.useShortURL !== undefined) {
      updateData.use_short_url = validatedData.data.useShortURL;
    }
    
    try {
      // 使用原始查询执行更新
      const result = await prisma.$transaction(async (tx) => {
        // 查询域名是否存在
        const domains = await tx.$queryRawUnsafe(
          `SELECT * FROM cloudflare_domains WHERE id = $1`,
          domainId
        );
        
        if (!domains || !domains[0]) {
          throw new Error("域名不存在");
        }
        
        const domain = domains[0];
        
        // 如果没有字段要更新，直接返回
        if (Object.keys(updateData).length === 0) {
          return domain;
        }
        
        // 构建更新SQL
        const sets = Object.entries(updateData)
          .map(([key, _], idx) => `${key} = $${idx + 2}`)
          .join(', ');
        
        const updateValues = [domainId, ...Object.values(updateData)];
        
        // 执行更新
        await tx.$executeRawUnsafe(
          `UPDATE cloudflare_domains SET ${sets} WHERE id = $1`,
          ...updateValues
        );
        
        // 获取更新后的域名
        const updatedDomains = await tx.$queryRawUnsafe(
          `SELECT * FROM cloudflare_domains WHERE id = $1`,
          domainId
        ) as any[];
        
        return updatedDomains[0];
      });
      
      return NextResponse.json({
        message: "域名用途已更新",
        domain: result,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "域名不存在") {
        return NextResponse.json(
          { error: "域名不存在" },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("更新域名用途失败:", error);
    return NextResponse.json(
      { error: "更新域名用途失败" },
      { status: 500 }
    );
  }
}

// GET: 获取单个域名详情
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "未授权访问" },
        { status: 401 }
      );
    }
    
    const domainId = params.id;
    
    // 使用原始查询获取域名
    const domains = await prisma.$queryRawUnsafe(
      `SELECT * FROM cloudflare_domains WHERE id = $1`,
      domainId
    );
    
    if (!domains || !domains[0]) {
      return NextResponse.json(
        { error: "域名不存在" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ domain: domains[0] });
  } catch (error) {
    console.error("获取域名详情失败:", error);
    return NextResponse.json(
      { error: "获取域名详情失败" },
      { status: 500 }
    );
  }
} 