import { useQuery } from '@tanstack/react-query';
import { getShoppingAccount } from './getShoppingAccount';

export const SHOPPING_ACCOUNT_QUERY_KEY = 'shoppingAccount';

export const useGetShoppingAccount = (id: string) => {
  return useQuery({
    queryKey: [SHOPPING_ACCOUNT_QUERY_KEY, id],
    queryFn: () => getShoppingAccount(id),
    enabled: !!id,
  });
};
