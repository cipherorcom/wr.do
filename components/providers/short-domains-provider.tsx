"use client";

import { useShortDomains } from "@/hooks/use-short-domains";
import { siteConfig } from "@/config/site";
import { createContext, useContext, useEffect, useState } from "react";

interface ShortDomainsContextType {
  domains: string[];
  loading: boolean;
  error: string | null;
}

const ShortDomainsContext = createContext<ShortDomainsContextType>({
  domains: [],
  loading: true,
  error: null,
});

export function useShortDomainsContext() {
  return useContext(ShortDomainsContext);
}

export function ShortDomainsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, error } = useShortDomains();
  const [domains, setDomains] = useState<string[]>([]);

  // 当siteConfig.shortDomains更新时，同步更新状态
  useEffect(() => {
    setDomains(siteConfig.shortDomains);
  }, [siteConfig.shortDomains]);

  return (
    <ShortDomainsContext.Provider value={{ domains, loading, error }}>
      {children}
    </ShortDomainsContext.Provider>
  );
} 