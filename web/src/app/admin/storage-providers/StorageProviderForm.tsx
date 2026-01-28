"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createStorageProvider, updateStorageProvider } from "../actions";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

// 阿里云 OSS 配置 Schema
const aliOSSConfigSchema = z.object({
  region: z.string().min(1, "区域不能为空"),
  accessKeyId: z.string().min(1, "AccessKeyId 不能为空"),
  accessKeySecret: z.string().min(1, "AccessKeySecret 不能为空"),
  bucket: z.string().min(1, "Bucket 不能为空"),
  endpoint: z.string().optional(),
});

// AWS S3 配置 Schema
const awsS3ConfigSchema = z.object({
  region: z.string().min(1, "区域不能为空"),
  accessKeyId: z.string().min(1, "AccessKeyId 不能为空"),
  secretAccessKey: z.string().min(1, "SecretAccessKey 不能为空"),
  bucket: z.string().min(1, "Bucket 不能为空"),
  endpoint: z.string().optional(),
});

// 腾讯云 COS 配置 Schema
const tencentCOSConfigSchema = z.object({
  region: z.string().min(1, "区域不能为空"),
  secretId: z.string().min(1, "SecretId 不能为空"),
  secretKey: z.string().min(1, "SecretKey 不能为空"),
  bucket: z.string().min(1, "Bucket 不能为空"),
});

const formSchema = z.object({
  providerCode: z.enum(["ali-oss", "aws-s3", "tencent-cos"]),
  providerName: z.string().min(1, "提供商名称不能为空"),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  config: z.union([aliOSSConfigSchema, awsS3ConfigSchema, tencentCOSConfigSchema]),
});

type FormValues = z.infer<typeof formSchema>;

interface StorageProviderFormProps {
  initialData?: {
    id: string;
    providerCode: string;
    providerName: string;
    config: Record<string, unknown>;
    isDefault: boolean;
    isActive: boolean;
  };
}

export function StorageProviderForm({ initialData }: StorageProviderFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [providerType, setProviderType] = useState<string>(
    initialData?.providerCode || "ali-oss"
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          providerCode: initialData.providerCode as "ali-oss" | "aws-s3" | "tencent-cos",
          providerName: initialData.providerName,
          isDefault: initialData.isDefault,
          isActive: initialData.isActive,
          config: initialData.config as any,
        }
      : {
          providerCode: "ali-oss",
          providerName: "",
          isDefault: false,
          isActive: true,
          config: {
            region: "",
            accessKeyId: "",
            accessKeySecret: "",
            bucket: "",
            endpoint: "",
          },
        },
  });

  const onSubmit = async (values: FormValues) => {
    if (!session?.user?.id) {
      alert("请先登录");
      return;
    }

    startTransition(async () => {
      try {
        if (initialData) {
          await updateStorageProvider({
            id: initialData.id,
            providerName: values.providerName,
            config: values.config as Record<string, unknown>,
            isDefault: values.isDefault,
            isActive: values.isActive,
            updatedById: session.user.id,
          });
        } else {
          await createStorageProvider({
            providerCode: values.providerCode,
            providerName: values.providerName,
            config: values.config as Record<string, unknown>,
            isDefault: values.isDefault,
            isActive: values.isActive,
            createdById: session.user.id,
          });
        }
        router.push("/admin/storage-providers");
        router.refresh();
      } catch (error) {
        console.error("保存失败:", error);
        alert(error instanceof Error ? error.message : "保存失败");
      }
    });
  };

  const renderConfigFields = () => {
    switch (providerType) {
      case "ali-oss":
        return (
          <>
            <FormField
              control={form.control}
              name="config.region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>区域 (Region)</FormLabel>
                  <FormControl>
                    <Input placeholder="例如: oss-cn-hangzhou" {...field} />
                  </FormControl>
                  <FormDescription>阿里云 OSS 的区域代码</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.accessKeyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Key ID</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="输入 Access Key ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.accessKeySecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Key Secret</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="输入 Access Key Secret" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.bucket"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bucket 名称</FormLabel>
                  <FormControl>
                    <Input placeholder="输入 Bucket 名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.endpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint (可选)</FormLabel>
                  <FormControl>
                    <Input placeholder="例如: oss-cn-hangzhou.aliyuncs.com" {...field} />
                  </FormControl>
                  <FormDescription>自定义访问域名</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );

      case "aws-s3":
        return (
          <>
            <FormField
              control={form.control}
              name="config.region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>区域 (Region)</FormLabel>
                  <FormControl>
                    <Input placeholder="例如: us-east-1" {...field} />
                  </FormControl>
                  <FormDescription>AWS S3 的区域代码</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.accessKeyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Key ID</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="输入 Access Key ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.secretAccessKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secret Access Key</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="输入 Secret Access Key" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.bucket"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bucket 名称</FormLabel>
                  <FormControl>
                    <Input placeholder="输入 Bucket 名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.endpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint (可选)</FormLabel>
                  <FormControl>
                    <Input placeholder="例如: https://s3.amazonaws.com" {...field} />
                  </FormControl>
                  <FormDescription>用于兼容 S3 的服务</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );

      case "tencent-cos":
        return (
          <>
            <FormField
              control={form.control}
              name="config.region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>区域 (Region)</FormLabel>
                  <FormControl>
                    <Input placeholder="例如: ap-guangzhou" {...field} />
                  </FormControl>
                  <FormDescription>腾讯云 COS 的区域代码</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.secretId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secret ID</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="输入 Secret ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.secretKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secret Key</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="输入 Secret Key" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.bucket"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bucket 名称</FormLabel>
                  <FormControl>
                    <Input placeholder="例如: mybucket-1234567890" {...field} />
                  </FormControl>
                  <FormDescription>格式: bucketname-appid</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/storage-providers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">
          {initialData ? "编辑存储配置" : "新增存储配置"}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="providerCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>提供商类型</FormLabel>
                    <Select
                      disabled={!!initialData}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setProviderType(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择存储提供商" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ali-oss">阿里云 OSS</SelectItem>
                        <SelectItem value="aws-s3">AWS S3</SelectItem>
                        <SelectItem value="tencent-cos">腾讯云 COS</SelectItem>
                      </SelectContent>
                    </Select>
                    {initialData && (
                      <FormDescription>创建后不可修改提供商类型</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="providerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>配置名称</FormLabel>
                    <FormControl>
                      <Input placeholder="例如: 生产环境-阿里云OSS" {...field} />
                    </FormControl>
                    <FormDescription>便于识别的配置名称</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-6">
                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">设为默认存储</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">启用</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>存储配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">{renderConfigFields()}</CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              <Save className="mr-2 h-4 w-4" />
              {isPending ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}