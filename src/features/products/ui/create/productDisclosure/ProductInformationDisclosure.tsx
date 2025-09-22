import { PRODUCT_INFO_TYPES } from './productDisclosureConstant';

export const ProductInformationDisclosure = () => {
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
            <Select value={productInfo.type} onValueChange={handleProductInfoTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="상품정보고시 종류를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRODUCT_INFO_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 선택된 종류에 따른 입력 필드들 */}
          {productInfo.type && (
            <div className="border-t pt-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {PRODUCT_INFO_TYPES[productInfo.type as keyof typeof PRODUCT_INFO_TYPES].fields.map((field) => (
                  <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2 lg:col-span-3' : ''}>
                    <div className="space-y-2">
                      <Label htmlFor={field.key}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>

                      {field.type === 'textarea' ? (
                        <Textarea
                          id={field.key}
                          value={productInfo[field.key] || ''}
                          onChange={(e) => handleProductInfoChange(field.key, e.target.value)}
                          placeholder={`${field.label}을(를) 입력하세요`}
                          rows={3}
                          required={field.required}
                        />
                      ) : field.type === 'select' ? (
                        <Select
                          value={productInfo[field.key] || ''}
                          onValueChange={(value) => handleProductInfoChange(field.key, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`${field.label}을(를) 선택하세요`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={field.key}
                          type={field.type}
                          value={productInfo[field.key] || ''}
                          onChange={(e) => handleProductInfoChange(field.key, e.target.value)}
                          placeholder={`${field.label}을(를) 입력하세요`}
                          required={field.required}
                        />
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
