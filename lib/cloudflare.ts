export const CLOUDFLARE_API_URL = "https://api.cloudflare.com/client/v4";

export interface CreateDNSRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied?: boolean;
  ttl?: number;
  tags?: string[];
  comment?: string;
}

export interface UpdateDNSRecord extends Omit<CreateDNSRecord, "id"> {}

export interface DNSRecordResponse {
  success: boolean;
  errors: ResultMeta[];
  messages: ResultMeta[];
  result?: DNSRecordResult;
  result_info?: {
    count: number;
    page: number;
    per_page: number;
    total_count: number;
  };
}

export interface DNSRecordResult {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  type: string;
  content: string;
  proxiable: boolean;
  proxied: boolean;
  ttl: number;
  meta: {
    auto_added: boolean;
    managed_by_apps: boolean;
    managed_by_argo_tunnel: boolean;
  };
  comment: string;
  tags: string[];
  created_on: string;
  modified_on: string;
}

export interface ResultMeta {
  code: number;
  message: string;
}

export type RecordType = "A" | "CNAME";

export const createDNSRecord = async (
  zoneId: string,
  apiKey: string,
  email: string,
  record: CreateDNSRecord,
): Promise<DNSRecordResponse> => {
  try {
    const url = `${CLOUDFLARE_API_URL}/zones/${zoneId}/dns_records`;

    // 打印请求详情以便调试，但隐藏敏感信息
    console.log("[Cloudflare API请求]", {
      url,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Email": email,
        // 隐藏API Key
      },
      body: JSON.stringify(record),
    });

    const headers = {
      "Content-Type": "application/json",
      "X-Auth-Email": email,
      "X-Auth-Key": apiKey,
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(record),
    });

    // 获取响应文本
    const responseText = await response.text();
    
    // 尝试解析为JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("[Cloudflare API响应解析失败]", responseText);
      return {
        success: false,
        errors: [{ code: 0, message: "响应解析失败: " + responseText }],
        messages: [],
      };
    }

    // 检查响应状态
    if (!response.ok) {
      console.error(`[Cloudflare API错误] ${response.status}:`, data);
    } else {
      console.log("[Cloudflare API响应成功]:", data.success);
    }

    return data;
  } catch (error) {
    console.error("[Cloudflare API调用异常]", error);
    return {
      success: false,
      errors: [{ code: 500, message: error.message || "未知错误" }],
      messages: [],
    };
  }
};

export const deleteDNSRecord = async (
  zoneId: string,
  apiKey: string,
  email: string,
  recordId: string,
): Promise<Pick<DNSRecordResponse, "result">> => {
  try {
    const url = `${CLOUDFLARE_API_URL}/zones/${zoneId}/dns_records/${recordId}`;

    const headers = {
      "Content-Type": "application/json",
      "X-Auth-Email": email,
      "X-Auth-Key": apiKey,
    };

    const response = await fetch(url, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error deleting DNS record.", error);
    throw error;
  }
};

export const updateDNSRecord = async (
  zoneId: string,
  apiKey: string,
  email: string,
  recordId: string,
  data: UpdateDNSRecord,
): Promise<DNSRecordResponse> => {
  try {
    const url = `${CLOUDFLARE_API_URL}/zones/${zoneId}/dns_records/${recordId}`;

    const headers = {
      "Content-Type": "application/json",
      "X-Auth-Email": email,
      "X-Auth-Key": apiKey,
    };

    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error status: ${response.status}`);
    }

    const res = await response.json();
    return res;
  } catch (error) {
    console.error("Error updating DNS record.", error);
    throw error;
  }
};

export const getDNSRecordsList = async (
  zoneId: string,
  apiKey: string,
  email: string,
  type?: RecordType,
  name?: string,
  page = 1,
  perPage = 100,
): Promise<DNSRecordResult[]> => {
  try {
    const url = `${CLOUDFLARE_API_URL}/zones/${zoneId}/dns_records?page=${page}&per_page=${perPage}&type=${type}&name=${name}`;

    const headers = {
      "Content-Type": "application/json",
      "X-Auth-Email": email,
      "X-Auth-Key": apiKey,
    };

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error status: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    throw error;
  }
};

export const getDNSRecordDetail = async (
  zoneId: string,
  apiKey: string,
  email: string,
  recordId: string,
): Promise<DNSRecordResponse> => {
  try {
    const url = `${CLOUDFLARE_API_URL}/zones/${zoneId}/dns_records/${recordId}`;

    const headers = {
      "Content-Type": "application/json",
      "X-Auth-Email": email,
      "X-Auth-Key": apiKey,
    };

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};
