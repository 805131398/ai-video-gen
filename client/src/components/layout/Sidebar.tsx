import SidebarHeader from './SidebarHeader';
import NavMenu from './NavMenu';
import SidebarFooter from './SidebarFooter';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen bg-white border-r border-slate-200
        flex flex-col
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-60'}
      `}
    >
      <SidebarHeader isCollapsed={isCollapsed} onToggle={onToggle} />
      <NavMenu isCollapsed={isCollapsed} />
      <SidebarFooter isCollapsed={isCollapsed} />
    </aside>
  );
}
