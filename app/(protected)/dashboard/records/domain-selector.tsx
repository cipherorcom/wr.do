"use client";

import { useState } from "react";

import { DomainSelect } from "@/components/shared/domain-select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DomainSelector({ onDomainChange }: { onDomainChange: (domainId: string) => void }) {
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");

  const handleDomainChange = (domainId: string) => {
    setSelectedDomainId(domainId);
    onDomainChange(domainId);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="py-4">
        <CardTitle className="text-lg">选择域名</CardTitle>
        <CardDescription>选择要管理DNS记录的域名</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid w-full gap-2">
          <Label htmlFor="domain">域名</Label>
          <DomainSelect
            domainType="dns"
            placeholder="选择域名"
            value={selectedDomainId}
            onValueChange={handleDomainChange}
          />
          <p className="text-xs text-muted-foreground">
            注意：此处只显示已启用DNS管理功能的域名
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 