import { useEffect, useState } from 'react';
import { siteConfig } from '@/config/site';

export function useShortDomains() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 只有当siteConfig.shortDomains为空时才去获取
    if (siteConfig.shortDomains.length === 0) {
      setLoading(true);
      
      fetch('/api/short-domains')
        .then(response => {
          if (!response.ok) {
            throw new Error(`获取短域名失败: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          // 更新siteConfig中的shortDomains
          if (data.domains && Array.isArray(data.domains)) {
            siteConfig.shortDomains = data.domains;
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('获取短域名失败:', err);
          setError(err.message);
          setLoading(false);
        });
    } else {
      // 如果已经有数据，则不需要加载
      setLoading(false);
    }
  }, []);

  return { loading, error };
} 