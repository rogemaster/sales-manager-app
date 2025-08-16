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
        title: '상품목록',
        url: '/products',
      },
      {
        title: '상품등록',
        url: '/products/create',
      },
      {
        title: '상품대량등록',
        url: '/products/bulk',
      },
    ],
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
        title: '쇼핑몰상품등록',
        url: '/shopping/register',
      },
      {
        title: '쇼핑몰상품목록',
        url: '/shopping/list',
      },
    ],
  },
  {
    title: '주문관리',
    url: '/order',
    icon: PackageIcon,
    items: [
      {
        title: '주문목록',
        url: '/order/list',
      },
    ],
  },
];
