import { MOCK_MALL_ADDRESS_BOOK } from '../data/MockMallAddressBookData';
import { MallAddress } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { ShoppingMalls } from '@/types/common.type';

export const getMockAddressBook = (mallCode: ShoppingMalls): MallAddress[] => {
  return MOCK_MALL_ADDRESS_BOOK[mallCode] ?? [];
};
