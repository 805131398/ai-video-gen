import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppSettings from '@/components/profile/AppSettings';
import PersonalInfo from '@/components/profile/PersonalInfo';
import SubscriptionManagement from '@/components/profile/SubscriptionManagement';

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
          <PersonalInfo />
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionManagement />
        </TabsContent>

        <TabsContent value="settings">
          <AppSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
