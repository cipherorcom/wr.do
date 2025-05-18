import { deleteDNSRecord } from "@/lib/cloudflare";
import { deleteUserRecord } from "@/lib/dto/cloudflare-dns-record";
import { checkUserStatus } from "@/lib/dto/user";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user instanceof Response) return user;

    const { record_id, zone_id, active } = await req.json();
    
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

    // 如果zone_id为空，尝试从记录中获取
    let zoneIdToUse = zone_id;
    if (!zoneIdToUse) {
      console.log("zone_id为空，尝试从记录中获取");
      const recordInfo = await prisma.$queryRawUnsafe(`
        SELECT * FROM cloudflare_dns_records WHERE record_id = $1
      `, record_id);
      
      if (recordInfo && recordInfo[0]) {
        zoneIdToUse = recordInfo[0].zone_id;
        console.log("从记录中获取到zone_id:", zoneIdToUse);
      } else {
        return new Response(JSON.stringify({ 
          error: "Record not found or zone_id missing" 
        }), {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
    }

    // Delete cf dns record first.
    const res = await deleteDNSRecord(
      zoneIdToUse, // 使用获取到的zone_id
      CLOUDFLARE_GLOBAL_KEY,
      CLOUDFLARE_EMAIL,
      record_id,
    );
    
    if (res && res.result?.id) {
      // Then delete user record.
      await deleteUserRecord(user.id, record_id, zoneIdToUse, active);
      return new Response(JSON.stringify({ 
        message: "success" 
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    
    return new Response(JSON.stringify({ 
      error: "Not Implemented"
    }), {
      status: 501,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ 
      error: error?.message || "Server error"
    }), {
      status: error?.status || 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
}
