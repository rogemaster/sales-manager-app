import { useAtom } from 'jotai';
import { orderStatusAtom } from '@/features/order/store/search.store';
import { ALL_ORDER_STATUS, ORDER_STATUS } from '@/features/order/constant/status.constants';
import { FilterSelect } from '@/components/common/FilterSelect';

export const OrderStateFilter = () => {
  const [getOrderStatusAtom, setOrderStatusAtom] = useAtom(orderStatusAtom);

  const handleOrderStatusChange = (value: string) => {
    setOrderStatusAtom(value);
  };

  return (
    <FilterSelect
      label="주문 상태"
      divClassName="flex items-center gap-4"
      labelClassName="w-20 text-right"
      value={getOrderStatusAtom}
      onValueChange={handleOrderStatusChange}
      options={ORDER_STATUS}
      allOption={ALL_ORDER_STATUS}
    />
  );
};
