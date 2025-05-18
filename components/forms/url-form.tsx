"use client";

import { Dispatch, SetStateAction, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "@prisma/client";
import { Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { siteConfig } from "@/config/site";
import { ShortUrlFormData } from "@/lib/dto/short-urls";
import { EXPIRATION_ENUMS } from "@/lib/enums";
import { generateUrlSuffix } from "@/lib/utils";
import { createUrlSchema } from "@/lib/validations/url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/shared/icons";
import { DomainSelect } from "@/components/shared/domain-select";

import { FormSectionColumns } from "../dashboard/form-section-columns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { useShortDomainsContext } from "@/components/providers/short-domains-provider";

export type FormData = ShortUrlFormData;

export type FormType = "add" | "edit";

export interface RecordFormProps {
  user: Pick<User, "id" | "name">;
  isShowForm: boolean;
  setShowForm: Dispatch<SetStateAction<boolean>>;
  type: FormType;
  initData?: ShortUrlFormData | null;
  action: string;
  onRefresh: () => void;
}

export function UrlForm({
  setShowForm,
  type,
  initData,
  action,
  onRefresh,
}: RecordFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const { domains, loading: loadingDomains } = useShortDomainsContext();
  
  // 域名选择状态
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const [selectedDomain, setSelectedDomain] = useState<string>(initData?.prefix || "");

  const {
    handleSubmit,
    register,
    formState: { errors },
    getValues,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(createUrlSchema),
    defaultValues: {
      id: initData?.id || "",
      target: initData?.target || "",
      url: initData?.url || generateUrlSuffix(6),
      active: initData?.active || 1,
      prefix: initData?.prefix || (domains.length > 0 ? domains[0] : ""),
      visible: initData?.visible || 1,
      expiration: initData?.expiration || "-1",
      password: initData?.password || "",
    },
  });

  // 处理域名选择
  const handleDomainChange = (domainId: string) => {
    setSelectedDomainId(domainId);
    
    // 获取域名详情
    fetch("/api/domains/available?type=shorturl")
      .then(response => response.json())
      .then(data => {
        const domain = data.domains.find((d: any) => d.id === domainId);
        if (domain) {
          setSelectedDomain(domain.domainName);
          setValue("prefix", domain.domainName);
        }
      })
      .catch(error => console.error("获取域名详情失败:", error));
  };

  const onSubmit = handleSubmit((data) => {
    if (type === "add" && !data.prefix) {
      toast.error("请先选择域名");
      return;
    }
    
    if (type === "add") {
      handleCreateUrl(data);
    } else if (type === "edit") {
      handleUpdateUrl(data);
    }
  });

  const handleCreateUrl = async (data: ShortUrlFormData) => {
    if (data.password !== "" && data.password.length !== 6) {
      toast.error("Password must be 6 characters!");
      return;
    }
    startTransition(async () => {
      const response = await fetch(`${action}/add`, {
        method: "POST",
        body: JSON.stringify({
          data,
        }),
      });
      if (!response.ok || response.status !== 200) {
        toast.error("Created Failed!", {
          description: await response.text(),
        });
      } else {
        // const res = await response.json();
        toast.success(`Created successfully!`);
        setShowForm(false);
        onRefresh();
      }
    });
  };

  const handleUpdateUrl = async (data: ShortUrlFormData) => {
    if (data.password !== "" && data.password.length !== 6) {
      toast.error("Password must be 6 characters!");
      return;
    }
    startTransition(async () => {
      if (type === "edit") {
        const response = await fetch(`${action}/update`, {
          method: "POST",
          body: JSON.stringify({ data, userId: initData?.userId }),
        });
        if (!response.ok || response.status !== 200) {
          toast.error("Update Failed", {
            description: await response.text(),
          });
        } else {
          const res = await response.json();
          toast.success(`Update successfully!`);
          setShowForm(false);
          onRefresh();
        }
      }
    });
  };

  const handleDeleteUrl = async () => {
    if (type === "edit") {
      startDeleteTransition(async () => {
        const response = await fetch(`${action}/delete`, {
          method: "POST",
          body: JSON.stringify({
            url_id: initData?.id,
            userId: initData?.userId,
          }),
        });
        if (!response.ok || response.status !== 200) {
          toast.error("Delete Failed", {
            description: await response.text(),
          });
        } else {
          await response.json();
          toast.success(`Success`);
          setShowForm(false);
          onRefresh();
        }
      });
    }
  };

  return (
    <div>
      <div className="rounded-t-lg bg-muted px-4 py-2 text-lg font-semibold">
        {type === "add" ? "Create" : "Edit"} short link
      </div>
      
      <form className="p-4" onSubmit={onSubmit}>
        {/* 域名选择区域 - 与record表单保持一致放在第一位 */}
        {type === "add" && (
          <div className="mb-4">
            <FormSectionColumns title="域名" required>
              <DomainSelect
                domainType="shortUrl"
                placeholder="选择要添加短链接的域名"
                value={selectedDomainId}
                onValueChange={handleDomainChange}
                disabled={loadingDomains}
              />
              <p className="p-1 text-[13px] text-muted-foreground">
                请先选择要添加短链接的域名
              </p>
            </FormSectionColumns>
          </div>
        )}

        {/* 其他表单项分组排列 */}
        <div className="items-center justify-start gap-4 md:flex">
          <FormSectionColumns title="Target URL" required>
            <div className="flex w-full items-center gap-2">
              <Label className="sr-only" htmlFor="target">
                Target
              </Label>
              <Input
                id="target"
                className="flex-1 shadow-inner h-9"
                size={32}
                {...register("target")}
              />
            </div>
            <div className="flex flex-col justify-between p-1">
              {errors?.target ? (
                <p className="pb-0.5 text-[13px] text-red-600">
                  {errors.target.message}
                </p>
              ) : (
                <p className="pb-0.5 text-[13px] text-muted-foreground">
                  Required. https://your-origin-url
                </p>
              )}
            </div>
          </FormSectionColumns>

          <FormSectionColumns title="Short Link Suffix" required>
            <div className="flex w-full items-center gap-2">
              <Label className="sr-only" htmlFor="url">
                Url Suffix
              </Label>
              <div className="relative w-full">
                <Input
                  id="url"
                  className="w-full shadow-inner h-9"
                  {...register("url")}
                  disabled={type === "edit"}
                />
                <div className="absolute right-0 top-0">
                  <Button
                    className="h-9 px-2 rounded-l-none"
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={type === "edit"}
                    onClick={() => {
                      setValue("url", generateUrlSuffix(6));
                    }}
                  >
                    <Sparkles className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-between p-1">
              {errors?.url ? (
                <p className="pb-0.5 text-[13px] text-red-600">
                  {errors.url.message}
                </p>
              ) : (
                <p className="pb-0.5 text-[13px] text-muted-foreground">
                  最终链接形式为: {selectedDomain || initData?.prefix || (domains.length > 0 ? domains[0] : "")}/s/suffix
                </p>
              )}
            </div>
          </FormSectionColumns>
        </div>
        
        <div className="items-center justify-start gap-4 md:flex">
          <FormSectionColumns title="Expiration" required>
            <Select
              onValueChange={(value: string) => {
                setValue("expiration", value);
              }}
              name="expiration"
              defaultValue={initData?.expiration || "-1"}
            >
              <SelectTrigger className="w-full shadow-inner h-9">
                <SelectValue placeholder="Select a time range" />
              </SelectTrigger>
              <SelectContent>
                {EXPIRATION_ENUMS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="p-1 text-[13px] text-muted-foreground">
              Expiration time, default for never.
            </p>
          </FormSectionColumns>

          <FormSectionColumns title="Password (Optional)">
            <div className="flex w-full items-center gap-2">
              <Label className="sr-only" htmlFor="password">
                Password
              </Label>
              <Input
                id="password"
                className="flex-1 shadow-inner h-9"
                size={32}
                maxLength={6}
                type="password"
                placeholder="Enter 6 character password"
                {...register("password")}
              />
            </div>
            <div className="flex flex-col justify-between p-1">
              {errors?.password ? (
                <p className="pb-0.5 text-[13px] text-red-600">
                  {errors.password.message}
                </p>
              ) : (
                <p className="pb-0.5 text-[13px] text-muted-foreground">
                  Optional. If you want to protect your link.
                </p>
              )}
            </div>
          </FormSectionColumns>
        </div>

        <div className="items-center justify-start gap-4 md:flex">
          <FormSectionColumns title="Status">
            <div className="flex w-full h-9 items-center gap-2">
              <Label className="sr-only" htmlFor="active">
                Status
              </Label>
              <Switch 
                id="active" 
                checked={watch("active") === 1}
                onCheckedChange={(checked) => {
                  setValue("active", checked ? 1 : 0);
                }}
              />
              <span className="text-sm text-muted-foreground ml-2">
                {watch("active") === 1 ? "启用" : "禁用"}
              </span>
            </div>
            <p className="p-1 text-[13px] text-muted-foreground">
              Enable or disable this short link
            </p>
          </FormSectionColumns>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex justify-end gap-3">
          {type === "edit" && (
            <Button
              type="button"
              variant="destructive"
              className="mr-auto"
              onClick={() => handleDeleteUrl()}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Icons.spinner className="size-4 animate-spin mr-2" />
              ) : null}
              Delete
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowForm(false);
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="default"
            disabled={isPending}
          >
            {isPending ? (
              <Icons.spinner className="size-4 animate-spin mr-2" />
            ) : null}
            {type === "edit" ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}
