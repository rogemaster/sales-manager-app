import { HomeIcon, PackageIcon, StoreIcon } from 'lucide-react';
import { MenuInterface } from '@/types/SidebarInterface';

export const GLOBAL_SIDEBAR_MENU: MenuInterface[] = [
  {
    title: '홈',
    url: '/',
    icon: HomeIcon,
  },
  {
    title: '상품관리',
    url: '/products',
    icon: PackageIcon,
    items: [
      {
        title: '삼품목록',
        url: '/products/list',
      },
      {
        title: '상품등록',
        url: '/products/insert',
      }
    ]
  },
  {
    title: '쇼핑몰관리',
    url: '#',
    icon: StoreIcon,
    items: [
      {
        title: '쇼핑몰설정',
        url: '/shopping/settings',
      },
      {
        title: '쇼핑몰',
        url: '/shopping/products',
      }
    ]
  }
]