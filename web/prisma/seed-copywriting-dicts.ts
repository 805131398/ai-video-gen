import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL!;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

// 文案属性字典定义
const copywritingDicts = [
  {
    code: "copy_perspective",
    name: "叙事视角",
    description: "文案的人称视角",
    items: [
      { label: "第一人称(我)", value: "first_person", sortOrder: 1 },
      { label: "第二人称(你)", value: "second_person", sortOrder: 2 },
      { label: "第三人称(他/她)", value: "third_person", sortOrder: 3 },
    ],
  },
  {
    code: "copy_role",
    name: "角色设定",
    description: "文案中的角色定位",
    items: [
      { label: "朋友", value: "friend", sortOrder: 1 },
      { label: "专家", value: "expert", sortOrder: 2 },
      { label: "老师", value: "teacher", sortOrder: 3 },
      { label: "博主", value: "blogger", sortOrder: 4 },
      { label: "普通人", value: "ordinary", sortOrder: 5 },
      { label: "子女", value: "child", sortOrder: 6 },
    ],
  },
  {
    code: "copy_gender",
    name: "角色性别",
    description: "角色的性别设定",
    items: [
      { label: "男", value: "male", sortOrder: 1 },
      { label: "女", value: "female", sortOrder: 2 },
      { label: "中性", value: "neutral", sortOrder: 3 },
    ],
  },
  {
    code: "copy_age",
    name: "角色年龄",
    description: "角色的年龄段",
    items: [
      { label: "少年", value: "teenager", sortOrder: 1 },
      { label: "青年", value: "young", sortOrder: 2 },
      { label: "中年", value: "middle_aged", sortOrder: 3 },
      { label: "老年", value: "elderly", sortOrder: 4 },
    ],
  },
  {
    code: "copy_purpose",
    name: "内容目的",
    description: "文案的主要目的",
    items: [
      { label: "种草", value: "recommend", sortOrder: 1 },
      { label: "科普", value: "educate", sortOrder: 2 },
      { label: "讲故事", value: "storytelling", sortOrder: 3 },
      { label: "带货", value: "sell", sortOrder: 4 },
      { label: "情感共鸣", value: "emotional", sortOrder: 5 },
    ],
  },
  {
    code: "copy_emotion",
    name: "情绪风格",
    description: "文案的情绪基调",
    items: [
      { label: "轻松", value: "relaxed", sortOrder: 1 },
      { label: "严肃", value: "serious", sortOrder: 2 },
      { label: "温馨", value: "warm", sortOrder: 3 },
      { label: "激动", value: "excited", sortOrder: 4 },
      { label: "平静", value: "calm", sortOrder: 5 },
    ],
  },
  {
    code: "copy_style",
    name: "内容风格",
    description: "文案的表达风格",
    items: [
      { label: "幽默", value: "humorous", sortOrder: 1 },
      { label: "专业", value: "professional", sortOrder: 2 },
      { label: "口语化", value: "colloquial", sortOrder: 3 },
      { label: "文艺", value: "literary", sortOrder: 4 },
      { label: "简洁", value: "concise", sortOrder: 5 },
    ],
  },
  {
    code: "copy_duration",
    name: "视频时长",
    description: "目标视频时长",
    items: [
      { label: "15秒", value: "15", sortOrder: 1 },
      { label: "30秒", value: "30", sortOrder: 2 },
      { label: "60秒", value: "60", sortOrder: 3 },
      { label: "90秒", value: "90", sortOrder: 4 },
    ],
  },
  {
    code: "copy_audience",
    name: "目标受众",
    description: "文案的目标受众群体",
    items: [
      { label: "年轻人", value: "youth", sortOrder: 1 },
      { label: "职场人", value: "professional", sortOrder: 2 },
      { label: "学生", value: "student", sortOrder: 3 },
      { label: "宝妈", value: "mother", sortOrder: 4 },
    ],
  },
];

async function main() {
  console.log("开始初始化文案属性字典数据...");

  for (const dictData of copywritingDicts) {
    // 查找或创建字典
    let dict = await prisma.dict.findFirst({
      where: { code: dictData.code, tenantId: null },
    });

    if (!dict) {
      dict = await prisma.dict.create({
        data: {
          code: dictData.code,
          name: dictData.name,
          description: dictData.description,
          isSystem: true,
          isActive: true,
        },
      });
      console.log(`创建字典: ${dictData.name}`);
    } else {
      await prisma.dict.update({
        where: { id: dict.id },
        data: {
          name: dictData.name,
          description: dictData.description,
        },
      });
      console.log(`更新字典: ${dictData.name}`);
    }

    // 创建或更新字典项
    for (const item of dictData.items) {
      const existingItem = await prisma.dictItem.findFirst({
        where: { dictId: dict.id, value: item.value },
      });

      if (!existingItem) {
        await prisma.dictItem.create({
          data: {
            dictId: dict.id,
            label: item.label,
            value: item.value,
            sortOrder: item.sortOrder,
            isActive: true,
          },
        });
      } else {
        await prisma.dictItem.update({
          where: { id: existingItem.id },
          data: {
            label: item.label,
            sortOrder: item.sortOrder,
          },
        });
      }
    }
    console.log(`  - 已处理 ${dictData.items.length} 个字典项`);
  }

  console.log("文案属性字典数据初始化完成");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
