import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { useAlert } from '@/hooks/useAlert';
import { Label } from '@/components/ui/label';

interface ProductOption {
  id: string;
  name: string;
  values: string[];
}

interface OptionCombination {
  id: string;
  combination: string;
  values: { [key: string]: string };
  quantity: string;
  skuCode: string;
}

export const ProductOptionInfo = () => {
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [isOptionsConfirmed, setIsOptionsConfirmed] = useState<boolean>(false);
  const [optionCombinations, setOptionCombinations] = useState<OptionCombination[]>([]);
  const [additionalOptions, setAdditionalOptions] = useState<ProductOption[]>([]);

  const { showAlert } = useAlert();

  // 옵션 조합 생성 함수
  const generateOptionCombinations = () => {
    if (options.length === 0) return [];

    // 유효한 옵션만 필터링 (이름과 값이 모두 있는 것)
    const validOptions = options.filter((opt) => opt.name.trim() && opt.values.some((val) => val.trim()));

    if (validOptions.length === 0) return [];

    // 각 옵션의 유효한 값들만 추출
    const optionData = validOptions.map((opt) => ({
      name: opt.name.trim(),
      values: opt.values.filter((val) => val.trim()).map((val) => val.trim()),
    }));

    console.log('옵션 데이터:', optionData); // 디버깅용

    // 조합 생성 (카르테시안 곱)
    const combinations: OptionCombination[] = [];

    const generateCombinations = (index: number, currentCombination: { [key: string]: string }) => {
      if (index === optionData.length) {
        // 조합 문자열 생성 (예: "색상: 빨강, 사이즈: S")
        const combinationString = Object.entries(currentCombination)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');

        combinations.push({
          id: `combo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          combination: combinationString,
          values: { ...currentCombination },
          quantity: '',
          skuCode: '',
        });
        return;
      }

      const currentOption = optionData[index];
      for (const value of currentOption.values) {
        generateCombinations(index + 1, {
          ...currentCombination,
          [currentOption.name]: value,
        });
      }
    };

    generateCombinations(0, {});

    console.log('생성된 조합:', combinations); // 디버깅용
    return combinations;
  };

  // 옵션 확정 처리
  const handleConfirmOptions = () => {
    // 유효성 검사
    const validOptions = options.filter((opt) => opt.name.trim() && opt.values.some((val) => val.trim()));

    if (validOptions.length === 0) {
      showAlert({
        type: 'warning',
        message: '유효한 옵션이 없습니다. 옵션명과 옵션값을 모두 입력해주세요.',
      });
      return;
    }

    // 빈 값이 있는 옵션 체크
    const incompleteOptions = validOptions.filter(
      (opt) => !opt.name.trim() || opt.values.filter((val) => val.trim()).length === 0,
    );

    if (incompleteOptions.length > 0) {
      showAlert({
        type: 'warning',
        message: '모든 옵션의 이름과 값을 입력해주세요.',
      });
      return;
    }

    const combinations = generateOptionCombinations();
    setOptionCombinations(combinations);
    setIsOptionsConfirmed(true);

    if (combinations.length > 0) {
      showAlert({
        type: 'success',
        message: `${combinations.length}개의 옵션 조합이 생성되었습니다.\n\n예시:\n${combinations
          .slice(0, 3)
          .map((c) => `• ${c.combination}`)
          .join('\n')}${combinations.length > 3 ? '\n...' : ''}`,
      });
    }
  };

  // 옵션 조합 수정
  const handleOptionCombinationChange = (id: string, field: 'quantity' | 'skuCode', value: string) => {
    setOptionCombinations((prev) => prev.map((combo) => (combo.id === id ? { ...combo, [field]: value } : combo)));
  };

  // 옵션 재설정
  const handleResetOptions = () => {
    showAlert({
      type: 'warning',
      message: '옵션을 재설정하면 기존 조합 데이터가 모두 삭제됩니다. 계속하시겠습니까?',
      showCancel: true,
      confirmText: '재설정',
      cancelText: '취소',
      onConfirm: () => {
        setIsOptionsConfirmed(false);
        setOptionCombinations([]);
      },
    });
  };

  // 옵션 추가
  const handleAddOption = (type: 'options' | 'additionalOptions') => {
    const newOption: ProductOption = {
      id: Date.now().toString(),
      name: '',
      values: [''],
    };

    if (type === 'options') {
      setOptions((prev) => [...prev, newOption]);
    } else {
      setAdditionalOptions((prev) => [...prev, newOption]);
    }
  };

  // 옵션 삭제
  const handleRemoveOption = (id: string, type: 'options' | 'additionalOptions') => {
    if (type === 'options') {
      setOptions((prev) => prev.filter((opt) => opt.id !== id));
    } else {
      setAdditionalOptions((prev) => prev.filter((opt) => opt.id !== id));
    }
  };

  // 옵션 이름 변경
  const handleOptionNameChange = (id: string, name: string, type: 'options' | 'additionalOptions') => {
    const updateOptions = type === 'options' ? setOptions : setAdditionalOptions;
    updateOptions((prev) => prev.map((opt) => (opt.id === id ? { ...opt, name } : opt)));
  };

  // 옵션 값 변경
  const handleOptionValueChange = (id: string, index: number, value: string, type: 'options' | 'additionalOptions') => {
    const updateOptions = type === 'options' ? setOptions : setAdditionalOptions;
    updateOptions((prev) =>
      prev.map((opt) =>
        opt.id === id ? { ...opt, values: opt.values.map((v, i) => (i === index ? value : v)) } : opt,
      ),
    );
  };

  // 옵션 값 추가
  const handleAddOptionValue = (id: string, type: 'options' | 'additionalOptions') => {
    const updateOptions = type === 'options' ? setOptions : setAdditionalOptions;
    updateOptions((prev) => prev.map((opt) => (opt.id === id ? { ...opt, values: [...opt.values, ''] } : opt)));
  };

  // 옵션 값 삭제
  const handleRemoveOptionValue = (id: string, index: number, type: 'options' | 'additionalOptions') => {
    const updateOptions = type === 'options' ? setOptions : setAdditionalOptions;
    updateOptions((prev) =>
      prev.map((opt) => (opt.id === id ? { ...opt, values: opt.values.filter((_, i) => i !== index) } : opt)),
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            옵션
            <div className="flex gap-2">
              {!isOptionsConfirmed ? (
                <>
                  <Button type="button" size="sm" onClick={() => handleAddOption('options')}>
                    <Plus className="h-4 w-4 mr-2" />
                    옵션 추가
                  </Button>
                  <Button type="button" size="sm" onClick={handleConfirmOptions} variant="default">
                    확정
                  </Button>
                </>
              ) : (
                <Button type="button" size="sm" onClick={handleResetOptions} variant="outline">
                  재설정
                </Button>
              )}
            </div>
          </CardTitle>
          <CardDescription>상품의 기본 옵션을 설정하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isOptionsConfirmed ? (
            <>
              {options.map((option) => (
                <div key={option.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Input
                      placeholder="옵션명 (예: 색상, 사이즈)"
                      value={option.name}
                      onChange={(e) => handleOptionNameChange(option.id, e.target.value, 'options')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOption(option.id, 'options')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {option.values.map((value, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="옵션값"
                          value={value}
                          onChange={(e) => handleOptionValueChange(option.id, index, e.target.value, 'options')}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddOptionValue(option.id, 'options')}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        {option.values.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveOptionValue(option.id, index, 'options')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {options.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  옵션을 추가하여 상품의 다양한 선택사항을 제공하세요.
                </p>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                설정된 옵션:{' '}
                {options.map((opt) => `${opt.name}(${opt.values.filter((v) => v.trim()).length}개)`).join(', ')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 옵션 조합 관리 */}
      {isOptionsConfirmed && optionCombinations.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>옵션 조합 관리</CardTitle>
            <CardDescription>
              생성된 {optionCombinations.length}개의 옵션 조합별로 수량과 SKU 코드를 설정하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 조합 목록을 테이블 형태로 표시 */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 font-medium text-sm border-b">옵션 조합 목록</div>
                <div className="divide-y">
                  {optionCombinations.map((combo, index) => (
                    <div key={combo.id} className="p-4 hover:bg-muted/30">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        {/* 조합 정보 */}
                        <div className="md:col-span-1">
                          <div className="font-medium text-sm mb-1">조합 {index + 1}</div>
                          <div className="text-sm text-muted-foreground">{combo.combination}</div>
                        </div>

                        {/* 수량 입력 */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">수량</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={combo.quantity}
                            onChange={(e) => handleOptionCombinationChange(combo.id, 'quantity', e.target.value)}
                            className="h-8"
                          />
                        </div>

                        {/* SKU 코드 입력 */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">SKU 코드</Label>
                          <Input
                            placeholder="SKU-001"
                            value={combo.skuCode}
                            onChange={(e) => handleOptionCombinationChange(combo.id, 'skuCode', e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 일괄 설정 버튼들 */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const quantity = prompt('모든 조합에 적용할 수량을 입력하세요:');
                    if (quantity && !isNaN(Number(quantity)) && Number(quantity) >= 0) {
                      setOptionCombinations((prev) => prev.map((combo) => ({ ...combo, quantity })));
                      showAlert({
                        type: 'success',
                        message: `모든 조합의 수량이 ${quantity}개로 설정되었습니다.`,
                      });
                    }
                  }}
                >
                  수량 일괄설정
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const prefix = prompt('SKU 코드 접두사를 입력하세요 (예: PRD-):');
                    if (prefix) {
                      setOptionCombinations((prev) =>
                        prev.map((combo, index) => ({
                          ...combo,
                          skuCode: `${prefix}${String(index + 1).padStart(3, '0')}`,
                        })),
                      );
                      showAlert({
                        type: 'success',
                        message: `모든 조합의 SKU 코드가 생성되었습니다.`,
                      });
                    }
                  }}
                >
                  SKU 일괄생성
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setOptionCombinations((prev) => prev.map((combo) => ({ ...combo, quantity: '', skuCode: '' })));
                    showAlert({
                      type: 'info',
                      message: '모든 조합의 수량과 SKU 코드가 초기화되었습니다.',
                    });
                  }}
                >
                  전체 초기화
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};
