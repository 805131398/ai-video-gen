import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppSettings from '@/components/profile/AppSettings';
import PersonalInfo from '@/components/profile/PersonalInfo';
import SubscriptionManagement from '@/components/profile/SubscriptionManagement';

export default function Profile() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
      <div className="w-full max-w-4xl">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            个人中心
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            管理您的账户信息和应用设置
          </p>
        </div>

        {/* 标签页内容 */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="personal" className="transition-all">
              个人信息
            </TabsTrigger>
            <TabsTrigger value="subscription" className="transition-all">
              订阅管理
            </TabsTrigger>
            <TabsTrigger value="settings" className="transition-all">
              应用设置
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-0">
            <PersonalInfo />
          </TabsContent>

          <TabsContent value="subscription" className="mt-0">
            <SubscriptionManagement />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <AppSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
