'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { PRODUCT_INFO_DISC_CATEGORY, PRODUCT_INFO_DISC_TYPES } from '../../../constant/infomationDisclosure.constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Product } from '@/features/products/types/product.types';

type ProductInfoType = typeof PRODUCT_INFO_DISC_TYPES;
type ProductInfoKey = keyof ProductInfoType;

export const ProductInformationDisclosureSection = () => {
  const [selectedKey, setSelectedKey] = useState<ProductInfoKey>('');

  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<Product>();

  const handleProductInfoTypeChange = (value: string | undefined) => {
    if (value) {
      const infoDisc = PRODUCT_INFO_DISC_CATEGORY[value];
      setSelectedKey(value);
      setValue('infomationDisclosure.id', infoDisc.id);
      setValue('infomationDisclosure.name', infoDisc.name);
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
            <Select
              value={selectedKey}
              onValueChange={handleProductInfoTypeChange}
              {...register('infomationDisclosure.id', { required: '상품정보고시를 선택해주세요.' })}
            >
              <SelectTrigger className="w-full">
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
            {errors.infomationDisclosure?.id && (
              <p className="text-red-500 text-sm">{errors.infomationDisclosure.id.message}</p>
            )}
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
                      {field.type && field.type === 'textarea' ? (
                        <>
                          <Textarea
                            id={field.key}
                            placeholder={`${field.placeholder ?? field.label}`}
                            rows={3}
                            {...register(`infomationDisclosure.fields.${field.key}`, {
                              required: `${field.label}을(를) 입력하세요.`,
                            })}
                          />
                          {errors.infomationDisclosure && errors.infomationDisclosure.fields && (
                            <p className="text-red-500 text-sm">
                              {errors.infomationDisclosure.fields[field.key]?.message}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <Input
                            id={field.key}
                            type={field.type}
                            placeholder={`${field.placeholder ?? field.label}`}
                            {...register(`infomationDisclosure.fields.${field.key}`, {
                              required: `${field.label}을(를) 입력하세요.`,
                            })}
                          />
                          {errors.infomationDisclosure && errors.infomationDisclosure.fields && (
                            <p className="text-red-500 text-sm">
                              {errors.infomationDisclosure.fields[field.key]?.message}
                            </p>
                          )}
                        </>
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
