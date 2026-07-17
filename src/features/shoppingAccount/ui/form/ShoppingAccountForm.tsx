'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MALL_NAME_OPTIONS } from '@/features/shoppingAccount/constant/shoppingAccount.constants';
import { PHONE_REGEX } from '@/shared/utils/phone';
import { MOCK_CATEGORY_DATA } from '@/mocks/data/MockCategoryData';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { ShoppingMalls } from '@/types/common.type';

const MALL_CODES: string[] = SHOPPING_MALLS.map((mall) => mall.code);

const shoppingAccountSchema = z.object({
  mallCode: z
    .string()
    .min(1, '쇼핑몰을 선택해주세요.')
    .refine((val): val is ShoppingMalls => MALL_CODES.includes(val), {
      message: '유효하지 않은 쇼핑몰입니다.',
    }),
  mallId: z.string().min(1, '쇼핑몰 ID를 입력해주세요.'),
  password: z.string().min(1, '패스워드를 입력해주세요.'),
  isActive: z.boolean(),
  nickname: z.string().optional(),
  managerMd: z.string().min(1, '담당MD를 입력해주세요.'),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || PHONE_REGEX.test(val), {
      message: '올바른 연락처 형식을 입력해주세요. (예: 010-1234-5678)',
    }),
  email: z
    .string()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: '올바른 이메일 형식을 입력해주세요.',
    }),
  domain: z.string().optional(),
  category: z.string().min(1, '카테고리를 선택해주세요.'),
  apiKey: z.string().optional(),
});

export type ShoppingAccountFormInput = z.input<typeof shoppingAccountSchema>;
export type ShoppingAccountFormData = z.output<typeof shoppingAccountSchema>;

interface ShoppingAccountFormProps {
  defaultValues?: Partial<ShoppingAccountFormData>;
  onSubmit: (data: ShoppingAccountFormData) => void;
  isSubmitting?: boolean;
  mode: 'create' | 'edit';
}

const IS_ACTIVE_OPTIONS = [
  { value: 'true', label: '사용' },
  { value: 'false', label: '미사용' },
];

export const ShoppingAccountForm = ({ defaultValues, onSubmit, isSubmitting, mode }: ShoppingAccountFormProps) => {
  const router = useRouter();

  const form = useForm<ShoppingAccountFormInput, unknown, ShoppingAccountFormData>({
    resolver: zodResolver(shoppingAccountSchema),
    defaultValues: {
      mallCode: '',
      mallId: '',
      password: '',
      isActive: true,
      nickname: '',
      managerMd: '',
      phone: '',
      email: '',
      domain: '',
      category: '',
      apiKey: '',
      ...defaultValues,
    },
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">계정 정보</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-6">
              {/* 쇼핑몰 선택 */}
              <FormField
                control={form.control}
                name="mallCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>쇼핑몰 선택 *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="쇼핑몰을 선택하세요." />
                        </SelectTrigger>
                        <SelectContent>
                          {MALL_NAME_OPTIONS.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 쇼핑몰 ID */}
              <FormField
                control={form.control}
                name="mallId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>쇼핑몰 ID *</FormLabel>
                    <FormControl>
                      <Input placeholder="쇼핑몰 ID를 입력하세요." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 패스워드 */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>패스워드 *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="패스워드를 입력하세요." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 사용여부 */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>사용여부 *</FormLabel>
                    <FormControl>
                      <Select
                        value={String(field.value)}
                        onValueChange={(val) => field.onChange(val === 'true')}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {IS_ACTIVE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 별명 */}
              <FormField
                control={form.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>별명</FormLabel>
                    <FormControl>
                      <Input placeholder="별명을 입력하세요." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 담당MD */}
              <FormField
                control={form.control}
                name="managerMd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>담당MD *</FormLabel>
                    <FormControl>
                      <Input placeholder="담당MD를 입력하세요." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 연락처 */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연락처</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="연락처를 입력하세요. (예: 010-1234-5678)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 이메일 */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="이메일을 입력하세요." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 도메인 */}
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>도메인</FormLabel>
                    <FormControl>
                      <Input placeholder="도메인을 입력하세요." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 카테고리 */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>카테고리 *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="카테고리를 선택하세요." />
                        </SelectTrigger>
                        <SelectContent>
                          {MOCK_CATEGORY_DATA.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 연동API */}
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연동API</FormLabel>
                    <FormControl>
                      <Input placeholder="연동 API를 입력하세요." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 빈 셀 (2열 맞춤) */}
              <div />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => form.reset(defaultValues ?? { isActive: true })}>
                초기화
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/shopping/accounts')}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {mode === 'create' ? '등록' : '저장'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
