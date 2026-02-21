import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSidebarState } from '../../hooks/useSidebarState';

export default function AppLayout() {
  const { isCollapsed, toggle } = useSidebarState();

  return (
    <div className="h-full flex bg-gray-50 overflow-hidden">
      <Sidebar isCollapsed={isCollapsed} onToggle={toggle} />
      <main className="flex-1 h-full overflow-y-auto relative">
        <Outlet />
      </main>
    </div>
  );
}
