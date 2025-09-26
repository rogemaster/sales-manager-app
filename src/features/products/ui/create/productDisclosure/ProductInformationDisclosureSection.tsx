'use client';

import { ChangeEvent, useState } from 'react';
import { PRODUCT_INFO_DISC_TYPES } from '../../../constant/productInfomationDisclosure';
import { ProductInfomationDisclosureType } from '@/features/products/types/ProductTypes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import { SingleDatePicker } from '@/components/common/SingleDatePicker';
import dayjs from 'dayjs';

type ProductInfoType = typeof PRODUCT_INFO_DISC_TYPES;
type ProductInfoKey = keyof ProductInfoType;

type SelectedProductInfomation = {
  id: string;
  name: string;
  [key: string]: string | number;
};

export const ProductInformationDisclosureSection = () => {
  const [selectedKey, setSelectedKey] = useState<ProductInfoKey>('');

  const {
    register,
    formState: { errors },
    setValue,
  } = useFormContext<SelectedProductInfomation>();

  const handleProductInfoTypeChange = (value: string | undefined) => {
    if (value) {
      setSelectedKey(value);
    }
  };

  const handleProductInfoChange = (key: string, value: string | Date) => {
    if (typeof value === Date()) {
      setValue(key, dayjs(value).format('YYYY-MM-DD'));
    } else {
      setValue(key, value as string);
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>상품정보고시</CardTitle>
        <CardDescription>전자상거래법에 따른 상품정보를 입력하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 상품정보고시 종류 선택 */}
          <div className="space-y-2">
            <Label htmlFor="productInfoType">상품정보고시 종류 *</Label>
            <Select value={selectedKey} onValueChange={handleProductInfoTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="상품정보고시 종류를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRODUCT_INFO_DISC_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 선택된 종류에 따른 입력 필드들 */}
          {selectedKey && (
            <div className="border-t pt-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {PRODUCT_INFO_DISC_TYPES[selectedKey].fields.map((field) => (
                  <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2 lg:col-span-3' : ''}>
                    <div className="space-y-2">
                      <Label htmlFor={field.key}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>

                      {field.type === 'textarea' && (
                        <>
                          <Textarea
                            id={field.key}
                            placeholder={`${field.label}을(를) 입력하세요`}
                            rows={3}
                            {...register(field.key, { required: field.required })}
                          />
                          {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                        </>
                      )}
                      {field.type === 'select' && (
                        <Select onValueChange={(value) => handleProductInfoChange(field.key, value)}>
                          <SelectTrigger>
                            <SelectValue placeholder={`${field.label}을(를) 선택하세요`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.values?.map((value) => (
                              <SelectItem key={value} value={value}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {field.type === 'text' ||
                        (field.type === 'number' && (
                          <>
                            <Input
                              id={field.key}
                              type={field.type}
                              placeholder={`${field.label}을(를) 입력하세요`}
                              {...register(field.key, { required: field.required })}
                            />
                            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                          </>
                        ))}
                      {field.type === 'month' && (
                        <SingleDatePicker date={} onChangeDate={(date) => handleProductInfoChange(field.key, date)} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
