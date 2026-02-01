import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Profile() {
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-2xl font-bold mb-6">个人中心</h1>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">个人信息</TabsTrigger>
          <TabsTrigger value="subscription">订阅管理</TabsTrigger>
          <TabsTrigger value="settings">应用设置</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <div className="p-6 border rounded-lg">
            <p className="text-slate-500">个人信息 Tab - 待实现</p>
          </div>
        </TabsContent>

        <TabsContent value="subscription">
          <div className="p-6 border rounded-lg">
            <p className="text-slate-500">订阅管理 Tab - 待实现</p>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="p-6 border rounded-lg">
            <p className="text-slate-500">应用设置 Tab - 待实现</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
