'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { PRODUCT_INFO_DISC_CATEGORY, PRODUCT_INFO_DISC_TYPES } from '../../../constant/informationDisclosure.constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Product } from '@/features/products/types/product.types';

export const ProductInformationDisclosureSection = () => {
  const {
    register,
    setValue,
    formState: { errors },
    watch,
    control,
  } = useFormContext<Product>();

  const selectedKey = watch('informationDisclosure.key');

  const handleProductInfoTypeChange = (value: string) => {
    const infoDisc = PRODUCT_INFO_DISC_CATEGORY[value];
    setValue('informationDisclosure.id', infoDisc.id);
    setValue('informationDisclosure.name', infoDisc.name);
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
            <Controller
              name="informationDisclosure.key"
              control={control}
              rules={{ required: '상품정보고시를 선택해주세요.' }}
              render={({ field, fieldState }) => (
                <>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleProductInfoTypeChange(value);
                    }}
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
                  {fieldState.error && <p className="text-red-500 text-sm">{fieldState.error.message}</p>}
                </>
              )}
            />
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
                            {...register(`informationDisclosure.fields.${field.key}`, {
                              required: field.required ? `${field.label}을(를) 입력하세요.` : false,
                            })}
                          />
                          {errors.informationDisclosure?.fields?.[field.key] && (
                            <p className="text-red-500 text-sm">
                              {errors.informationDisclosure.fields[field.key]?.message}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <Input
                            id={field.key}
                            type={field.type}
                            placeholder={`${field.placeholder ?? field.label}`}
                            {...register(`informationDisclosure.fields.${field.key}`, {
                              required: field.required ? `${field.label}을(를) 입력하세요.` : false,
                            })}
                          />
                          {errors.informationDisclosure?.fields?.[field.key] && (
                            <p className="text-red-500 text-sm">
                              {errors.informationDisclosure.fields[field.key]?.message}
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
