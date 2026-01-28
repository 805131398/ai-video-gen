import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSidebarState } from '../../hooks/useSidebarState';

export default function AppLayout() {
  const { isCollapsed, toggle } = useSidebarState();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} onToggle={toggle} />
      <main
        className={`
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'ml-16' : 'ml-60'}
        `}
      >
        <Outlet />
      </main>
    </div>
  );
}
