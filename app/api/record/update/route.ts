import { updateDNSRecord } from "@/lib/cloudflare";
import {
  updateUserRecord,
  updateUserRecordState,
} from "@/lib/dto/cloudflare-dns-record";
import { checkUserStatus } from "@/lib/dto/user";
import { reservedDomains } from "@/lib/enums";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";

// update record
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
    const CLOUDFLARE_GLOBAL_KEY = config.global_key;
    const CLOUDFLARE_EMAIL = config.email;

    const { record, recordId, selectedDomainId } = await req.json();

    // 获取记录所在域名信息
    let selectedDomain;
    
    if (selectedDomainId) {
      // 通过selectedDomainId获取域名信息
      const domains = await prisma.$queryRawUnsafe(`
        SELECT * FROM cloudflare_domains WHERE id = $1
      `, selectedDomainId);
      
      if (domains && domains[0]) {
        selectedDomain = domains[0];
      }
    }
    
    // 如果通过selectedDomainId没有找到域名，尝试从记录ID查找
    if (!selectedDomain) {
      console.log("未通过selectedDomainId找到域名，尝试从记录查找");
      
      // 先查找记录信息，获取zone_id
      const recordInfo = await prisma.$queryRawUnsafe(`
        SELECT * FROM cloudflare_dns_records WHERE record_id = $1
      `, recordId);
      
      if (recordInfo && recordInfo[0]) {
        const zoneId = recordInfo[0].zone_id;
        
        // 使用zone_id查找域名
        const domains = await prisma.$queryRawUnsafe(`
          SELECT * FROM cloudflare_domains WHERE zone_id = $1
        `, zoneId);
        
        if (domains && domains[0]) {
          selectedDomain = domains[0];
        }
      }
    }
    
    if (!selectedDomain) {
      return new Response(JSON.stringify({ 
        error: "Domain information not found" 
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    
    const CLOUDFLARE_ZONE_NAME = selectedDomain.domain_name;
    const CLOUDFLARE_ZONE_ID = selectedDomain.zone_id;

    // 处理记录名称
    const record_name = record.name.endsWith(`.${CLOUDFLARE_ZONE_NAME}`)
      ? record.name
      : record.name + `.${CLOUDFLARE_ZONE_NAME}`;
      
    if (reservedDomains.includes(record_name)) {
      return new Response(JSON.stringify({ 
        error: "Domain name is reserved" 
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    const data = await updateDNSRecord(
      CLOUDFLARE_ZONE_ID,
      CLOUDFLARE_GLOBAL_KEY,
      CLOUDFLARE_EMAIL,
      recordId,
      record,
    );
    console.log("updateDNSRecord", data);

    if (!data.success || !data.result?.id) {
      return new Response(JSON.stringify({ 
        errors: data.errors 
      }), {
        status: 501,
        headers: {
          "Content-Type": "application/json"
        }
      });
    } else {
      const res = await updateUserRecord(user.id, {
        record_id: data.result.id,
        zone_id: CLOUDFLARE_ZONE_ID,
        zone_name: CLOUDFLARE_ZONE_NAME,
        name: data.result.name,
        type: data.result.type,
        content: data.result.content,
        proxied: data.result.proxied,
        proxiable: data.result.proxiable,
        ttl: data.result.ttl,
        comment: data.result.comment ?? "",
        tags: data.result.tags?.join("") ?? "",
        modified_on: data.result.modified_on,
        active: 1,
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
    console.log(error);
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

// update record state
export async function PUT(req: Request) {
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
    const CLOUDFLARE_GLOBAL_KEY = config.global_key;
    const CLOUDFLARE_EMAIL = config.email;

    const { zone_id, record_id, target, active } = await req.json();

    let isTargetAccessible = false;
    try {
      const target_res = await fetch(`https://${target}`);
      isTargetAccessible = target_res.status === 200;
    } catch (fetchError) {
      isTargetAccessible = false;
      // console.log(`Failed to access target: ${fetchError}`);
    }

    const res = await updateUserRecordState(
      user.id,
      record_id,
      zone_id,
      isTargetAccessible ? 1 : 0,
    );

    if (!res) {
      return new Response(JSON.stringify({ 
        error: "An error occurred" 
      }), {
        status: 502,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    
    return new Response(JSON.stringify({ 
      message: isTargetAccessible ? "Target is accessible!" : "Target is unaccessible!" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ 
      error: `An error occurred: ${error?.message || "Unknown error"}` 
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
}
