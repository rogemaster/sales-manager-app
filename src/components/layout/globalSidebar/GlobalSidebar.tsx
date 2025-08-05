import { Sidebar } from '@/components/ui/sidebar';
import { GlobalSidebarMenu } from './GlobalSidebarMenu';

export const GlobalSidebar = () => {
  return (
    <Sidebar className="pt-16 border-r w-[15rem]" collapsible="icon">
      <GlobalSidebarMenu />
    </Sidebar>
  );
};
