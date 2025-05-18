"use client";

import { Dispatch, SetStateAction, useState, useTransition, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "@prisma/client";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { CreateDNSRecord, RecordType } from "@/lib/cloudflare";
import { UserRecordFormData } from "@/lib/dto/cloudflare-dns-record";
import { RECORD_TYPE_ENUMS, TTL_ENUMS } from "@/lib/enums";
import { createRecordSchema } from "@/lib/validations/record";
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

export type FormData = CreateDNSRecord;

export type FormType = "add" | "edit";

export interface RecordFormProps {
  user: Pick<User, "id" | "name">;
  isShowForm: boolean;
  setShowForm: Dispatch<SetStateAction<boolean>>;
  type: FormType;
  initData?: UserRecordFormData | null;
  action: string;
  onRefresh: () => void;
}

export function RecordForm({
  user,
  isShowForm,
  setShowForm,
  type,
  initData,
  action,
  onRefresh,
}: RecordFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [currentRecordType, setCurrentRecordType] = useState(
    initData?.type || "CNAME",
  );
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const [selectedDomainName, setSelectedDomainName] = useState<string>("");
  const [recordDomainSuffix, setRecordDomainSuffix] = useState<string>("");

  const {
    handleSubmit,
    register,
    formState: { errors },
    getValues,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(createRecordSchema),
    defaultValues: {
      type: initData?.type || "CNAME",
      ttl: initData?.ttl || 1,
      proxied: initData?.proxied || false,
      comment: initData?.comment || "",
      name: initData?.name || "",
      content: initData?.content || "",
    },
  });

  // 记录默认值
  useEffect(() => {
    console.log("表单默认值 - proxied:", initData?.proxied);
    
    // 确保初始化时对proxied进行正确设置
    if (initData?.proxied !== undefined) {
      setValue("proxied", initData.proxied);
      console.log("已设置初始proxied值:", initData.proxied);
    }
  }, [initData, setValue]);

  useEffect(() => {
    if (type === "edit" && initData?.name) {
      const fullName = initData.name;
      const zoneName = initData.zone_name;
      
      if (fullName === zoneName) {
        setValue("name", "@");
        setRecordDomainSuffix(zoneName);
      } else if (fullName.endsWith(`.${zoneName}`)) {
        const subdomainPart = fullName.slice(0, -(zoneName.length + 1));
        setValue("name", subdomainPart);
        setRecordDomainSuffix(zoneName);
      } else {
        setRecordDomainSuffix("");
      }
      
      if (initData.zone_id) {
        fetch("/api/admin/cloudflare/domains")
          .then(response => response.json())
          .then(data => {
            const domain = data.domains.find((d: any) => d.zoneId === initData.zone_id);
            if (domain) {
              console.log("找到记录所属域名:", domain);
              setSelectedDomainId(domain.id);
              setSelectedDomainName(domain.domainName);
            } else {
              console.warn("未找到匹配的域名，将使用记录中的域名ID作为备选");
              // 在找不到匹配域名的情况下，尝试直接使用记录中的数据
              const fallbackDomain = data.domains.find((d: any) => d.domainName === zoneName);
              if (fallbackDomain) {
                console.log("找到匹配域名名称的域名:", fallbackDomain);
                setSelectedDomainId(fallbackDomain.id);
                setSelectedDomainName(fallbackDomain.domainName);
              }
            }
          })
          .catch(error => console.error("获取域名详情失败:", error));
      }
      
      console.log(`[编辑模式] 域名: ${initData.zone_name}, 记录名: ${initData.name}`);
    }
  }, [type, initData, setValue]);

  useEffect(() => {
    if (selectedDomainName && type === "add") {
      console.log(`已选择域名: ${selectedDomainName}`);
    }
  }, [selectedDomainName, type]);

  const handleDomainChange = (domainId: string) => {
    setSelectedDomainId(domainId);
    
    console.log("选择了域名ID:", domainId);
    
    fetch("/api/admin/cloudflare/domains")
      .then(response => response.json())
      .then(data => {
        const domain = data.domains.find((d: any) => d.id === domainId);
        if (domain) {
          console.log("找到域名信息:", domain);
          setSelectedDomainName(domain.domainName);
        }
      })
      .catch(error => console.error("获取域名详情失败:", error));
  };

  const onSubmit = handleSubmit((data) => {
    if (type === "add" && !selectedDomainId) {
      toast.error("请先选择域名", {
        description: "必须选择一个域名才能创建DNS记录"
      });
      return;
    }
    
    console.log("提交前表单数据:", data);
    
    // 添加模式 - 使用选择的域名
    if (selectedDomainName && type === "add") {
      console.log("选择的域名:", selectedDomainName);
      
      if (!data.name.endsWith(selectedDomainName)) {
        if (data.name === '@') {
          data.name = selectedDomainName;
        } else {
          data.name = `${data.name}.${selectedDomainName}`;
        }
      }
      
      console.log("处理后的表单数据:", data);
    } 
    // 编辑模式 - 使用原记录的域名
    else if (recordDomainSuffix && type === "edit") {
      console.log("编辑模式域名:", recordDomainSuffix);
      
      if (!data.name.endsWith(recordDomainSuffix)) {
        if (data.name === '@') {
          data.name = recordDomainSuffix;
        } else {
          data.name = `${data.name}.${recordDomainSuffix}`;
        }
      }
      
      console.log("编辑后的表单数据:", data);
    }
    
    if (type === "add") {
      handleCreateRecord(data);
    } else if (type === "edit") {
      handleUpdateRecord(data);
    }
  });

  const handleCreateRecord = async (data: CreateDNSRecord) => {
    startTransition(async () => {
      // 确保表单数据中包含proxied值
      console.log("提交表单数据，proxied值为:", data.proxied);
      
      console.log("发送到API的数据:", {
        records: [data],
        selectedDomainId
      });
      
      const response = await fetch(`${action}/add`, {
        method: "POST",
        body: JSON.stringify({
          records: [data],
          selectedDomainId
        }),
      });

      if (!response.ok || response.status !== 200) {
        const errorText = await response.text();
        console.error("API错误:", errorText);
        toast.error("创建失败!", {
          description: errorText,
        });
      } else {
        toast.success(`创建成功!`);
        setShowForm(false);
        onRefresh();
      }
    });
  };

  const handleUpdateRecord = async (data: CreateDNSRecord) => {
    startTransition(async () => {
      if (type === "edit") {
        console.log("更新记录，域名ID:", selectedDomainId);
        // 添加proxied状态日志
        console.log("更新记录，proxied状态:", data.proxied);
        
        // 如果selectedDomainId为空，尝试使用其他方法获取域名ID
        let domainIdToUse = selectedDomainId;
        
        if (!domainIdToUse && initData?.zone_id) {
          console.log("selectedDomainId为空，尝试从域名列表获取");
          try {
            const response = await fetch("/api/admin/cloudflare/domains");
            const domainData = await response.json();
            const domain = domainData.domains.find((d: any) => d.zoneId === initData.zone_id);
            if (domain) {
              console.log("重新查询到域名ID:", domain.id);
              domainIdToUse = domain.id;
            }
          } catch (error) {
            console.error("获取域名ID失败:", error);
          }
        }
        
        if (!domainIdToUse) {
          toast.error("未能确定域名信息", {
            description: "请刷新页面后重试"
          });
          return;
        }
        
        const response = await fetch(`${action}/update`, {
          method: "POST",
          body: JSON.stringify({
            recordId: initData?.record_id,
            record: data,
            userId: initData?.userId,
            selectedDomainId: domainIdToUse
          }),
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

  const handleDeleteRecord = async () => {
    if (type === "edit") {
      startDeleteTransition(async () => {
        const response = await fetch(`${action}/delete`, {
          method: "POST",
          body: JSON.stringify({
            record_id: initData?.record_id,
            zone_id: initData?.zone_id,
            active: initData?.active,
            userId: initData?.userId,
            selectedDomainId
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
        {type === "add" ? "Create" : "Edit"} record
      </div>
      <form className="p-4" onSubmit={onSubmit}>
        {type === "add" && (
          <div className="mb-4">
            <FormSectionColumns title="域名" required>
              <DomainSelect
                domainType="dns"
                placeholder="选择要添加记录的域名"
                value={selectedDomainId}
                onValueChange={handleDomainChange}
              />
              <p className="p-1 text-[13px] text-muted-foreground">
                请先选择要添加DNS记录的域名
              </p>
            </FormSectionColumns>
          </div>
        )}

        <div className="items-center justify-start gap-4 md:flex">
          <FormSectionColumns title="Type" required>
            <Select
              onValueChange={(value: RecordType) => {
                setValue("type", value);
                setCurrentRecordType(value);
              }}
              name={"type"}
              defaultValue={initData?.type || "CNAME"}
            >
              <SelectTrigger className="w-full shadow-inner">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {RECORD_TYPE_ENUMS.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="p-1 text-[13px] text-muted-foreground">Required.</p>
          </FormSectionColumns>
          <FormSectionColumns title="Name" required>
            <div className="flex w-full items-center gap-2">
              <Label className="sr-only" htmlFor="name">
                Name (required)
              </Label>
              <div className="relative w-full">
                <Input
                  id="name"
                  className="flex-1 shadow-inner"
                  size={32}
                  {...register("name")}
                />
                {selectedDomainName && type === "add" ? (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    .{selectedDomainName}
                  </span>
                ) : type === "edit" && recordDomainSuffix ? (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    .{recordDomainSuffix}
                  </span>
                ) : (currentRecordType === "CNAME" || currentRecordType === "A") && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    .cipheror.com
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col justify-between p-1">
              {errors?.name ? (
                <p className="pb-0.5 text-[13px] text-red-600">
                  {errors.name.message}
                </p>
              ) : (
                <p className="pb-0.5 text-[13px] text-muted-foreground">
                  {"Required. Use @ for root."}
                </p>
              )}
            </div>
          </FormSectionColumns>
        </div>

        <div className="items-center justify-start gap-4 md:flex">
          <FormSectionColumns title="TTL" required>
            <Select
              onValueChange={(value: string) => {
                setValue("ttl", Number(value));
              }}
              name="ttl"
              defaultValue={String(initData?.ttl || 1)}
            >
              <SelectTrigger className="w-full shadow-inner">
                <SelectValue placeholder="Select a time" />
              </SelectTrigger>
              <SelectContent>
                {TTL_ENUMS.map((ttl) => (
                  <SelectItem key={ttl.value} value={ttl.value}>
                    {ttl.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="p-1 text-[13px] text-muted-foreground">
              Optional. Time To Live.
            </p>
          </FormSectionColumns>
          <FormSectionColumns
            title={
              currentRecordType === "CNAME"
                ? "Content"
                : currentRecordType === "A"
                  ? "IPv4 address"
                  : "Content"
            }
          >
            <div className="flex w-full items-center gap-2">
              <Label className="sr-only" htmlFor="content">
                Content
              </Label>
              <Input
                id="content"
                className="flex-1 shadow-inner"
                size={32}
                {...register("content")}
              />
            </div>
            <div className="flex flex-col justify-between p-1">
              {errors?.content ? (
                <p className="pb-0.5 text-[13px] text-red-600">
                  {errors.content.message}
                </p>
              ) : (
                <p className="pb-0.5 text-[13px] text-muted-foreground">
                  {currentRecordType === "CNAME"
                    ? "Required. E.g. www.example.com"
                    : currentRecordType === "A"
                      ? "Required. E.g. 8.8.8.8"
                      : "Required."}
                </p>
              )}
            </div>
          </FormSectionColumns>
        </div>

        <div className="items-center justify-start gap-4 md:flex">
          <FormSectionColumns title="Comment">
            <div className="flex items-center gap-2">
              <Label className="sr-only" htmlFor="comment">
                Comment
              </Label>
              <Input
                id="comment"
                className="flex-2 shadow-inner"
                size={74}
                {...register("comment")}
              />
            </div>
            <p className="p-1 text-[13px] text-muted-foreground">
              Enter your comment here (up to 100 characters)
            </p>
          </FormSectionColumns>
          <FormSectionColumns title="Proxy">
            <div className="flex w-full items-center gap-2">
              <Label className="sr-only" htmlFor="proxy">
                Proxy
              </Label>
              <Switch 
                id="proxied" 
                checked={watch("proxied")}
                onCheckedChange={(checked) => {
                  setValue("proxied", checked);
                  console.log("Proxy状态已更改为:", checked);
                }}
              />
              <span className="ml-2 text-xs text-muted-foreground">
                {watch("proxied") ? "已开启" : "已关闭"}
              </span>
            </div>
            <p className="p-1 text-[13px] text-muted-foreground">
              Proxy status
            </p>
          </FormSectionColumns>
        </div>

        <div className="mt-3 flex justify-end gap-3">
          {type === "edit" && (
            <Button
              type="button"
              variant="destructive"
              className="mr-auto w-[80px] px-0"
              onClick={() => handleDeleteRecord()}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Icons.spinner className="size-4 animate-spin" />
              ) : (
                <p>Delete</p>
              )}
            </Button>
          )}
          <Button
            type="reset"
            variant="outline"
            className="w-[80px] px-0"
            onClick={() => setShowForm(false)}
          >
            Cancle
          </Button>
          <Button
            type="submit"
            variant="blue"
            disabled={isPending || (type === "add" && !selectedDomainId)}
            className="w-[80px] shrink-0 px-0"
          >
            {isPending ? (
              <Icons.spinner className="size-4 animate-spin" />
            ) : (
              <p>{type === "edit" ? "Update" : "Save"}</p>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
