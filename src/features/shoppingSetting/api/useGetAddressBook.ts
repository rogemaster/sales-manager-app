import { useQuery } from '@tanstack/react-query';
import { getAddressBook, MallAddressType } from './getAddressBook';

export const ADDRESS_BOOK_QUERY_KEY = 'shoppingSettingAddressBook';

export const useGetAddressBook = (mallAccountId: string, addressType: MallAddressType, enabled: boolean) => {
  return useQuery({
    queryKey: [ADDRESS_BOOK_QUERY_KEY, mallAccountId, addressType],
    queryFn: () => getAddressBook(mallAccountId, addressType),
    enabled: enabled && !!mallAccountId,
  });
};
