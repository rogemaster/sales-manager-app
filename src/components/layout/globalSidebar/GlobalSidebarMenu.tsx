import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GLOBAL_SIDEBAR_MENU } from '@/constant/sidebarMenu.constant';

export const GlobalSidebarMenu = () => {
  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {GLOBAL_SIDEBAR_MENU.map((menu) => (
              <SidebarMenuItem key={menu.title}>
                {menu.items ? (
                  <Collapsible className="group/collapsible">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-full">
                        <menu.icon className="h-4 w-4" />
                        <span>{menu.title}</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {menu.items.map((subMenu) => (
                          <SidebarMenuSubItem key={subMenu.title}>
                            <SidebarMenuSubButton asChild>
                              <Link href={subMenu.url}>{subMenu.title}</Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <SidebarMenuButton asChild>
                    <Link href={menu.url} className="flex items-center gap-4">
                      <menu.icon className="h-4 w-4" />
                      <span className="text-sm">{menu.title}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
};
