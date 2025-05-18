import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { checkUserStatus } from "@/lib/dto/user";

export async function GET() {
  try {
    // 验证用户身份
    const user = checkUserStatus(await getCurrentUser());
    if (user instanceof Response) return user;

    // 从数据库查询已启用短链接服务的域名
    const domains = await prisma.$queryRaw`
      SELECT domain_name FROM cloudflare_domains 
      WHERE use_short_url = true
    `;

    // 转换为字符串数组
    const shortDomains = (domains as { domain_name: string }[]).map(
      domain => domain.domain_name
    );

    return Response.json({ domains: shortDomains });
  } catch (error) {
    console.error("获取短链接域名失败:", error);
    return Response.json({ error: "获取短链接域名失败" }, { status: 500 });
  }
} 