import { useQuery } from '@tanstack/react-query';
import { ShoppingMalls } from '@/types/common.type';
import { getAddressBook } from './getAddressBook';

export const ADDRESS_BOOK_QUERY_KEY = 'shoppingSettingAddressBook';

export const useGetAddressBook = (mallCode: ShoppingMalls, mallId: string, enabled: boolean) => {
  return useQuery({
    queryKey: [ADDRESS_BOOK_QUERY_KEY, mallCode, mallId],
    queryFn: () => getAddressBook(mallCode, mallId),
    enabled: enabled && !!mallCode && !!mallId,
  });
};
