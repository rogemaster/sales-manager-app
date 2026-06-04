'use client';

import { useRef } from 'react';
import { Control, Controller, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RegisterFormData, formatBusinessNumber } from '@/features/auth/util/registerValidation';
import { MOCK_CATEGORY_DATA } from '@/mocks/data/MockCategoryData';

type Props = {
  register: UseFormRegister<RegisterFormData>;
  control: Control<RegisterFormData>;
  errors: FieldErrors<RegisterFormData>;
  businessLicense: File | null;
  businessLicenseError: string;
  onFileChange: (file: File | null) => void;
};

export const CompanyInfoSection = ({
  register,
  control,
  errors,
  businessLicense,
  businessLicenseError,
  onFileChange,
}: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">회사 정보</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 상호/법인명 */}
            <div className="grid gap-1.5">
              <Label htmlFor="companyName">
                상호/법인명 <span className="text-destructive">*</span>
              </Label>
              <Input id="companyName" {...register('companyName')} />
              {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
            </div>

            {/* 대표자명 */}
            <div className="grid gap-1.5">
              <Label htmlFor="representativeName">
                대표자명 <span className="text-destructive">*</span>
              </Label>
              <Input id="representativeName" {...register('representativeName')} />
              {errors.representativeName && (
                <p className="text-xs text-destructive">{errors.representativeName.message}</p>
              )}
            </div>

            {/* 사업자등록번호 */}
            <div className="grid gap-1.5">
              <Label htmlFor="businessNumber">
                사업자등록번호 <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="businessNumber"
                control={control}
                render={({ field }) => (
                  <Input
                    id="businessNumber"
                    placeholder="000-00-00000"
                    value={field.value}
                    onChange={(e) => field.onChange(formatBusinessNumber(e.target.value))}
                  />
                )}
              />
              {errors.businessNumber && (
                <p className="text-xs text-destructive">{errors.businessNumber.message}</p>
              )}
            </div>

            {/* 업종 */}
            <div className="grid gap-1.5">
              <Label>
                업종 <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="businessCategory"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="업종 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_CATEGORY_DATA.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.businessCategory && (
                <p className="text-xs text-destructive">{errors.businessCategory.message}</p>
              )}
            </div>
          </div>

          {/* 사업자등록증 파일 첨부 */}
          <div className="grid gap-1.5">
            <Label>
              사업자등록증 <span className="text-destructive">*</span>
            </Label>
            <button
              type="button"
              className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 text-muted-foreground transition-colors hover:bg-muted/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="text-sm">📎</span>
              <span className="text-xs">
                {businessLicense ? businessLicense.name : '파일 선택 (JPG, JPEG, PNG, PDF)'}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
            {businessLicenseError && <p className="text-xs text-destructive">{businessLicenseError}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
