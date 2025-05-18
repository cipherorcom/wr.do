import { prisma } from "@/lib/db";

// 公共API接口，返回所有启用了短链接服务的域名
export async function GET() {
  try {
    // 从数据库查询已启用短链接服务的域名
    const domains = await prisma.$queryRaw`
      SELECT domain_name FROM cloudflare_domains 
      WHERE use_short_url = true
    `;

    // 转换为字符串数组
    const shortDomains = (domains as { domain_name: string }[]).map(
      domain => domain.domain_name
    );

    // 如果没有找到域名，返回空数组
    if (!shortDomains.length) {
      return Response.json({ domains: [] });
    }

    return Response.json({ domains: shortDomains });
  } catch (error) {
    console.error("获取短链接域名失败:", error);
    return Response.json({ domains: [] }, { status: 200 });
  }
} 