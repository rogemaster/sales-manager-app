import { ShoppingMalls } from '@/types/common.type';

export interface MallAccountRaw {
  mallCode: ShoppingMalls;
  mallName: string;
  mallId: string;
  password: string;
}

export const MOCK_MALL_ACCOUNTS: MallAccountRaw[] = [
  { mallCode: 'AUC', mallName: '옥션', mallId: 'auction_admin', password: 'auction@pw1' },
  { mallCode: 'GMK', mallName: '지마켓', mallId: 'gadmin1111', password: 'gmarket@pw2' },
  { mallCode: '11ST', mallName: '11번가', mallId: 'elevenst_shop', password: '11st@pw3' },
  { mallCode: 'INTP', mallName: '인터파크', mallId: 'ipark_seller', password: 'interpark@pw4' },
  { mallCode: 'NSST', mallName: '스마트스토어', mallId: 'naver_store', password: 'naver@pw5' },
  { mallCode: 'COUP', mallName: '쿠팡', mallId: 'coupang_seller', password: 'coupang@pw6' },
  { mallCode: 'CJH', mallName: 'CJ홈쇼핑', mallId: 'cjhome_seller', password: 'cjhome@pw7' },
  { mallCode: 'GSH', mallName: 'GS홈쇼핑', mallId: 'gshome_seller', password: 'gshome@pw8' },
  { mallCode: 'LOTH', mallName: '롯데홈쇼핑', mallId: 'lotte_seller', password: 'lotte@pw9' },
  { mallCode: 'SSGC', mallName: 'SSG', mallId: 'ssg_seller', password: 'ssg@pw10' },
  { mallCode: 'HDH', mallName: '현대홈쇼핑', mallId: 'hyundai_seller', password: 'hyundai@pw11' },
  { mallCode: 'OHOU', mallName: '오늘의집', mallId: 'ohou_seller', password: 'ohou@pw12' },
  { mallCode: 'HALF', mallName: '하프클럽', mallId: 'half_seller', password: 'half@pw13' },
  { mallCode: 'MUSIN', mallName: '무신사스토어', mallId: 'musin_seller', password: 'musin@pw14' },
  { mallCode: 'KAKAOS', mallName: '카카오스토어', mallId: 'kakao_shop', password: 'kakao@pw15' },
  { mallCode: 'MUST', mallName: '머스트잇', mallId: 'mustit_seller', password: 'mustit@pw16' },
];
