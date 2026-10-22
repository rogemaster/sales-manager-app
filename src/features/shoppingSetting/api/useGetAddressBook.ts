import { useQuery } from '@tanstack/react-query';
import { getAddressBook } from './getAddressBook';
import { MallAddressType } from '../types/shoppingSetting.types';
import { ADDRESS_BOOK_QUERY_KEY } from '@/features/shoppingSetting/constant/queryKey.constant';

export const useGetAddressBook = (mallAccountId: string, addressType: MallAddressType, enabled: boolean) => {
  return useQuery({
    queryKey: [ADDRESS_BOOK_QUERY_KEY, mallAccountId, addressType],
    queryFn: () => getAddressBook(mallAccountId, addressType),
    enabled: enabled && !!mallAccountId,
  });
};
