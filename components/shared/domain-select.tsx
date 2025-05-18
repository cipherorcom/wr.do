"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon, CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Icons } from "@/components/shared/icons";

export type DomainType = "dns" | "email" | "shortUrl";

interface Domain {
  id: string;
  domainName: string;
  canUseDNS: boolean;
  canUseEmails: boolean;
  canUseShortURL: boolean;
}

interface DomainSelectProps {
  domainType?: DomainType;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DomainSelect({
  domainType = "dns",
  value,
  onValueChange,
  placeholder = "选择域名",
  disabled = false,
  className,
}: DomainSelectProps) {
  const [open, setOpen] = useState(false);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        setLoading(true);
        
        // 根据域名类型构建查询参数
        let apiUrl = "/api/domains/available";
        if (domainType === "dns") {
          apiUrl += "?type=dns";
        } else if (domainType === "email") {
          apiUrl += "?type=email";
        } else if (domainType === "shortUrl") {
          apiUrl += "?type=shorturl";
        }
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error("获取域名列表失败");
        }
        
        const data = await response.json();
        setDomains(data.domains);
      } catch (error) {
        console.error("加载域名失败:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDomains();
  }, [domainType]);
  
  // 获取当前选中域名的名称（通过域名或ID匹配）
  const selectedDomain = domains.find(domain => domain.id === value || domain.domainName === value);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between h-9 px-3 py-2 text-sm", className)}
        >
          {loading ? (
            <Icons.spinner className="size-4 animate-spin" />
          ) : value && selectedDomain ? (
            <span className="truncate">{selectedDomain.domainName}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[340px] p-0" align="start">
        <Command className="w-full">
          <CommandList className="max-h-[300px] overflow-auto">
            <CommandEmpty>未找到匹配的域名</CommandEmpty>
            <CommandGroup className="p-1.5">
              {domains.map((domain) => (
                <CommandItem
                  key={domain.id}
                  value={domain.domainName}
                  onSelect={() => {
                    onValueChange(domain.id);
                    setOpen(false);
                  }}
                  className="flex items-center px-4 py-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <span className="truncate font-medium">{domain.domainName}</span>
                  <CheckIcon
                    className={cn(
                      "ml-auto size-5",
                      value === domain.id || value === domain.domainName ? "text-primary opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 