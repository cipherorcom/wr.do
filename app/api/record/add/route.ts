import { TeamPlanQuota } from "@/config/team";
import { createDNSRecord } from "@/lib/cloudflare";
import {
  createUserRecord,
  getUserRecordByTypeNameContent,
  getUserRecordCount,
} from "@/lib/dto/cloudflare-dns-record";
import { checkUserStatus } from "@/lib/dto/user";
import { reservedDomains } from "@/lib/enums";
import { getCurrentUser } from "@/lib/session";
import { generateSecret } from "@/lib/utils";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user instanceof Response) return user;

    // 从数据库获取Cloudflare配置
    const configs = await prisma.$queryRawUnsafe(`
      SELECT * FROM cloudflare_configs 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (!configs || !configs[0]) {
      return new Response(JSON.stringify({ 
        error: "Cloudflare configuration not found" 
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    
    const config = configs[0];
    const CLOUDFLARE_ACCOUNT_ID = config.account_id;
    const CLOUDFLARE_GLOBAL_KEY = config.global_key;
    const CLOUDFLARE_EMAIL = config.email;

    // 从请求体获取选择的域名ID
    const requestBody = await req.json();
    const { records, selectedDomainId } = requestBody;
    
    if (!selectedDomainId) {
      return new Response(JSON.stringify({ 
        error: "Please select a domain" 
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    
    // 从数据库获取域名信息
    const domains = await prisma.$queryRawUnsafe(`
      SELECT * FROM cloudflare_domains WHERE id = $1
    `, selectedDomainId);
    
    if (!domains || !domains[0]) {
      return new Response(JSON.stringify({ 
        error: "Domain not found" 
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    
    const selectedDomain = domains[0];
    
    if (!selectedDomain.use_dns) {
      return new Response(JSON.stringify({ 
        error: "DNS management is not enabled for this domain" 
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    
    const CLOUDFLARE_ZONE_NAME = selectedDomain.domain_name;
    const CLOUDFLARE_ZONE_ID = selectedDomain.zone_id;

    // Check quota: 若是管理员则不检查，否则检查
    const { total } = await getUserRecordCount(user.id);
    if (
      user.role !== "ADMIN" &&
      total >= TeamPlanQuota[user.team].RC_NewRecords
    ) {
      return new Response(JSON.stringify({ 
        error: "Your records have reached the free limit" 
      }), {
        status: 409,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    console.log("[记录请求]", JSON.stringify(records, null, 2));

    const record = {
      ...records[0],
      id: generateSecret(16),
      // type: "CNAME",
    };
    
    // 记录proxied状态
    console.log("[记录proxied状态]", record.proxied);

    // 保存完整域名用于数据库记录
    const fullDomainName = record.name;
    console.log("[完整域名]", fullDomainName);
    
    // 处理域名 - 去除域名后缀
    // 例如：如果record.name是"baidu.swwith.me"，CLOUDFLARE_ZONE_NAME是"swwith.me"
    // 则应该向Cloudflare API发送的name应该是"baidu"
    let record_name = fullDomainName;
    
    // 检查是否包含zone域名作为后缀
    if (fullDomainName.endsWith(`.${CLOUDFLARE_ZONE_NAME}`)) {
      // 移除域名后缀
      record_name = fullDomainName.slice(0, -(CLOUDFLARE_ZONE_NAME.length + 1)); // +1 是为了移除点号
    } else if (fullDomainName === CLOUDFLARE_ZONE_NAME) {
      // 如果完全匹配zone域名，使用@表示根域名
      record_name = "@";
    }
    
    console.log("[处理后的记录名]", record_name);
    console.log("[Zone名称]", CLOUDFLARE_ZONE_NAME);

    if (reservedDomains.includes(fullDomainName)) {
      return new Response(JSON.stringify({ 
        error: "Domain name is reserved" 
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    const user_record = await getUserRecordByTypeNameContent(
      user.id,
      record.type,
      fullDomainName,
      record.content,
      1,
    );
    if (user_record && user_record.length > 0) {
      return new Response(JSON.stringify({ 
        error: "Record already exists" 
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    // 创建记录前的参数日志
    console.log("[API参数]", {
      zoneId: CLOUDFLARE_ZONE_ID, // 使用选择的域名的zoneId
      email: CLOUDFLARE_EMAIL,
      recordData: {
        ...record,
        name: record_name, // 使用修改后不包含zone的记录名
      },
    });

    const recordToCreate = {
      ...record,
      name: record_name, // 使用修改后不包含zone的记录名
    };
    
    const data = await createDNSRecord(
      CLOUDFLARE_ZONE_ID, // 使用选择的域名的zoneId
      CLOUDFLARE_GLOBAL_KEY,
      CLOUDFLARE_EMAIL,
      recordToCreate,
    );

    if (!data.success || !data.result?.id) {
      console.log("[Cloudflare API响应]", data);
      return new Response(JSON.stringify({ 
        error: data.messages || data.errors || "Failed to create record" 
      }), {
        status: 501,
        headers: {
          "Content-Type": "application/json"
        }
      });
    } else {
      const res = await createUserRecord(user.id, {
        record_id: data.result.id,
        zone_id: CLOUDFLARE_ZONE_ID,
        zone_name: CLOUDFLARE_ZONE_NAME,
        name: fullDomainName, // 存储完整域名
        type: data.result.type,
        content: data.result.content,
        proxied: data.result.proxied,
        proxiable: data.result.proxiable,
        ttl: data.result.ttl,
        comment: data.result.comment ?? "",
        tags: data.result.tags?.join("") ?? "",
        created_on: data.result.created_on,
        modified_on: data.result.modified_on,
        active: 0,
      });

      if (res.status !== "success") {
        return new Response(JSON.stringify({ 
          error: res.status 
        }), {
          status: 502,
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
      return new Response(JSON.stringify(res.data), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
  } catch (error) {
    console.error("[详细错误]", error);
    return new Response(JSON.stringify({ 
      error: error?.message || "An error occurred" 
    }), {
      status: error?.status || 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
}
