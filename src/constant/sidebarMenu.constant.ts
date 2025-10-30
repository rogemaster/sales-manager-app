import { HomeIcon, PackageIcon, Settings, StoreIcon } from 'lucide-react';
import { MenuInterface } from '@/types/sidebar.type';

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
        url: '/products/list',
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
        title: '주문수집',
        url: '/order/collect',
      },
      {
        title: '주문등록',
        url: '/order/register',
      },
      {
        title: '주문목록',
        url: '/order/list',
      },
    ],
  },
  {
    title: '설정',
    url: '/setting',
    icon: Settings,
    items: [
      {
        title: '계정관리',
        url: '/account',
      },
      {
        title: '업체관리',
        url: '/company',
      },
    ],
  },
];
