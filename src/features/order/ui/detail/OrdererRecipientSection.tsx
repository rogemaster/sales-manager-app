'use client';

import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { OrderDetail } from '../../types/order.types';
import { useDaumPostcode } from '@/hooks/useDaumPostcode';
import { phoneNumberFormatter } from '@/utils/numberGenerator';
import { Field } from './Field';

type Props = {
  order: OrderDetail;
  isEditMode: boolean;
};

export const OrdererRecipientSection = ({ order, isEditMode }: Props) => {
  const { register, setValue } = useFormContext<OrderDetail>();

  const { openPostcode: openOrdererPostcode } = useDaumPostcode(({ zipCode, address }) => {
    setValue('orderZipCode', zipCode);
    setValue('orderAddress', address);
  });

  const { openPostcode: openPayeePostcode } = useDaumPostcode(({ zipCode, address }) => {
    setValue('payeeZipCode', zipCode);
    setValue('payeeAddress', address);
  });

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* 주문자 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>주문자 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="이름">
            {isEditMode ? (
              <Input {...register('orderName')} />
            ) : (
              <p className="text-sm font-medium">{order.orderName}</p>
            )}
          </Field>
          <Field label="연락처">
            {isEditMode ? (
              <Input {...register('orderPhoneNumber')} />
            ) : (
              <p className="text-sm font-medium">{phoneNumberFormatter(order.orderPhoneNumber)}</p>
            )}
          </Field>
          <Field label="우편번호">
            {isEditMode ? (
              <div className="flex gap-2">
                <Input {...register('orderZipCode')} readOnly className="flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={openOrdererPostcode}>
                  주소검색
                </Button>
              </div>
            ) : (
              <p className="text-sm font-medium">{order.orderZipCode}</p>
            )}
          </Field>
          <Field label="주소">
            {isEditMode ? (
              <Input {...register('orderAddress')} readOnly />
            ) : (
              <p className="text-sm font-medium">{order.orderAddress}</p>
            )}
          </Field>
          <Field label="상세주소">
            {isEditMode ? (
              <Input {...register('orderDetailAddress')} placeholder="상세주소를 입력하세요" />
            ) : (
              <p className="text-sm font-medium">{order.orderDetailAddress || '-'}</p>
            )}
          </Field>
        </CardContent>
      </Card>

      {/* 수취인 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>수취인 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="이름">
            {isEditMode ? (
              <Input {...register('payeeName')} />
            ) : (
              <p className="text-sm font-medium">{order.payeeName}</p>
            )}
          </Field>
          <Field label="연락처">
            {isEditMode ? (
              <Input {...register('payeePhoneNumber')} />
            ) : (
              <p className="text-sm font-medium">{phoneNumberFormatter(order.payeePhoneNumber)}</p>
            )}
          </Field>
          <Field label="우편번호">
            {isEditMode ? (
              <div className="flex gap-2">
                <Input {...register('payeeZipCode')} readOnly className="flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={openPayeePostcode}>
                  주소검색
                </Button>
              </div>
            ) : (
              <p className="text-sm font-medium">{order.payeeZipCode}</p>
            )}
          </Field>
          <Field label="주소">
            {isEditMode ? (
              <Input {...register('payeeAddress')} readOnly />
            ) : (
              <p className="text-sm font-medium">{order.payeeAddress}</p>
            )}
          </Field>
          <Field label="상세주소">
            {isEditMode ? (
              <Input {...register('payeeDetailAddress')} placeholder="상세주소를 입력하세요" />
            ) : (
              <p className="text-sm font-medium">{order.payeeDetailAddress || '-'}</p>
            )}
          </Field>
          <Field label="배송메시지">
            {isEditMode ? (
              <Input {...register('deliveryMessage')} placeholder="배송메시지를 입력하세요" />
            ) : (
              <p className="text-sm font-medium">{order.deliveryMessage || '-'}</p>
            )}
          </Field>
        </CardContent>
      </Card>
    </div>
  );
};
