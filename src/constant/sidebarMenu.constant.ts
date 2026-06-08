import { HomeIcon, PackageIcon, ShoppingCart, StoreIcon, UserCog } from 'lucide-react';
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
    url: '/shopping',
    icon: StoreIcon,
    items: [
      {
        title: '쇼핑몰설정',
        url: '/shopping/settings',
        disabled: true,
      },
      {
        title: '쇼핑몰상품등록',
        url: '/shopping/register',
        disabled: true,
      },
      {
        title: '쇼핑몰상품목록',
        url: '/shopping/list',
        disabled: true,
      },
    ],
  },
  {
    title: '주문관리',
    url: '/order',
    icon: ShoppingCart,
    items: [
      {
        title: '주문수집',
        url: '/order/collect',
      },
      {
        title: '주문목록',
        url: '/order/list',
      },
      {
        title: '주문등록',
        url: '/order/create',
      },
    ],
  },
  {
    title: '계정관리',
    url: '/account',
    icon: UserCog,
    items: [
      {
        title: '사용자관리',
        url: '/account/user',
      },
      {
        title: '매입처관리',
        url: '/account/purchase',
        disabled: true,
      },
      {
        title: '매출처관리',
        url: '/account/sales',
        disabled: true,
      },
    ],
  },
];
