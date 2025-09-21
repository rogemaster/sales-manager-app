import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { useAlert } from '@/hooks/useAlert';
import { Label } from '@/components/ui/label';

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

    const combinations = generate();
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
      <Card></Card>

      {/* 옵션 조합 관리 */}
    </>
  );
};
