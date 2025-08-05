import { LucideIcon } from 'lucide-react';

export interface MenuInterface {
  title: string;
  url: string;
  icon: LucideIcon;
  items?: SubMenuInterface[];
}

export interface SubMenuInterface {
  title: string;
  url: string;
}