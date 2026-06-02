import { TableTitleValue } from '@/types/common.type';

export const LIST_TABLE_HEAD: TableTitleValue[] = [
  { id: 'productCode',       title: '상품코드', width: 'w-40'  },
  { id: 'productName',       title: '상품명'                   },
  { id: 'categoryCode',      title: '카테고리', width: 'w-28'  },
  { id: 'productNetPrice',   title: '공급가',   width: 'w-28'  },
  { id: 'productPrice',      title: '판매가',   width: 'w-28'  },
  { id: 'productStatus',     title: '판매상태', width: 'w-28'  },
  { id: 'productCreateDate', title: '등록일',   width: 'w-32'  },
  { id: 'productUpdateDate', title: '수정일',   width: 'w-32'  },
];
