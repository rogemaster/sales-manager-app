import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import {
  GetMallLinkedProductsResponse,
  MallLinkedProduct,
  MallLinkedProductSearch,
  MallLinkedProductSearchType,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';

dayjs.extend(isBetween);

// 검색 타입별로 어떤 값을 대상으로 매칭할지 정의한다.
const SEARCH_TARGET: Record<MallLinkedProductSearchType, (item: MallLinkedProduct) => string> = {
  productName: (item) => item.productSnapshot.name,
  productCode: (item) => item.sourceProductId,
  externalProductCode: (item) => item.externalProductId ?? '',
  createdBy: (item) => item.createdByEmail,
  updatedBy: (item) => item.updatedByEmail ?? '',
};

const filterByDate = (
  dateType: MallLinkedProductSearch['dateType'],
  startDate: string,
  endDate: string,
  data: MallLinkedProduct[],
) => data.filter((item) => dayjs(item[dateType]).isBetween(startDate, endDate, 'day', '[]'));

const filterByMallCode = (mallCode: MallLinkedProductSearch['mallCode'], data: MallLinkedProduct[]) => {
  if (!mallCode || mallCode === 'ALL') return data;
  return data.filter((item) => item.mallCode === mallCode);
};

// 계정은 스냅샷에서 읽는다 — 연동 데이터는 오리지널 설정과 값이 동기화되지 않으므로,
// 설정 id로 거슬러 올라가 지금의 계정을 보면 전송 당시와 다른 답이 나올 수 있다.
const filterByMallAccount = (mallAccountId: string, data: MallLinkedProduct[]) => {
  if (!mallAccountId || mallAccountId === 'ALL') return data;
  return data.filter((item) => item.settingSnapshot.mallAccountId === mallAccountId);
};

// 설정은 top-level의 불변 식별 정보(sourceShoppingSettingId)로 거른다.
// 계정만 스냅샷을 보는 이유는 top-level에 계정 필드가 없기 때문이다.
const filterBySetting = (shoppingSettingId: string, data: MallLinkedProduct[]) => {
  if (!shoppingSettingId || shoppingSettingId === 'ALL') return data;
  return data.filter((item) => item.sourceShoppingSettingId === shoppingSettingId);
};

const filterByLinkStatus = (linkStatus: MallLinkedProductSearch['linkStatus'], data: MallLinkedProduct[]) => {
  if (!linkStatus || linkStatus === 'ALL') return data;
  return data.filter((item) => item.status === linkStatus);
};

const filterBySaleState = (saleState: MallLinkedProductSearch['saleState'], data: MallLinkedProduct[]) => {
  if (!saleState || saleState === 'ALL') return data;
  return data.filter((item) => item.productSnapshot.state === saleState);
};

const filterBySearchValue = (
  searchType: MallLinkedProductSearchType,
  searchValue: string,
  data: MallLinkedProduct[],
) => {
  if (!searchValue) return data;
  const target = SEARCH_TARGET[searchType];
  return data.filter((item) => target(item).includes(searchValue));
};

export const getMockMallLinkedProducts = (
  ownerId: string,
  searchParams: MallLinkedProductSearch,
  page: number,
  pageSize: number,
): GetMallLinkedProductsResponse => {
  const {
    dateType,
    startDate,
    endDate,
    mallCode,
    mallAccountId,
    shoppingSettingId,
    linkStatus,
    saleState,
    searchType,
    searchValue,
  } = searchParams;

  const byOwner = MOCK_MALL_LINKED_PRODUCT_DATA.filter((item) => item.ownerId === ownerId);
  const byDate = filterByDate(dateType, startDate, endDate, byOwner);
  const byMall = filterByMallCode(mallCode, byDate);
  const byAccount = filterByMallAccount(mallAccountId, byMall);
  const bySetting = filterBySetting(shoppingSettingId, byAccount);
  const byStatus = filterByLinkStatus(linkStatus, bySetting);
  const bySaleState = filterBySaleState(saleState, byStatus);
  const filtered = filterBySearchValue(searchType, searchValue, bySaleState);

  // 최종연동일시(lastSentAt) 내림차순 — 원본 배열을 변형하지 않도록 복사본을 정렬한다.
  const sorted = [...filtered].sort((a, b) => dayjs(b.lastSentAt).valueOf() - dayjs(a.lastSentAt).valueOf());

  const total = sorted.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const linkedProducts = sorted.slice((page - 1) * pageSize, page * pageSize);

  return { linkedProducts, total, page, pageSize, totalPages };
};
