import { useState } from 'react';
import { useAlert } from '@/hooks/useAlert';

export const ProductCreateLayout = () => {
  const { showAlert } = useAlert();
  const [formData, setFormData] = useState({
    customerProductCode: '',
    productName: '',
    keywords: '',
    category: '',
    supplyPrice: '',
    salePrice: '',
    totalQuantity: '',
    productDescription: '',
    shippingPolicy: '',
    shippingFee: '',
  });

  // const handleInputChange = (field: string, value: string) => {
  //   setFormData((prev) => ({ ...prev, [field]: value }));
  // };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    const requiredFields = [
      { field: 'customerProductCode', name: '고객사 상품코드' },
      { field: 'productName', name: '상품명' },
      { field: 'category', name: '카테고리' },
      { field: 'supplyPrice', name: '공급가' },
      { field: 'salePrice', name: '판매가' },
      { field: 'totalQuantity', name: '총수량' },
      { field: 'shippingPolicy', name: '배송정책' },
    ];

    const missingFields = requiredFields.filter(({ field }) => !formData[field as keyof typeof formData]);

    if (missingFields.length > 0) {
      showAlert({
        type: 'warning',
        message: `다음 필수 항목을 입력해주세요: ${missingFields.map((f) => f.name).join(', ')}`,
      });
      return;
    }

    // 배송정책이 선결제인 경우 배송비 필수
    if (formData.shippingPolicy === 'prepaid' && !formData.shippingFee) {
      showAlert({
        type: 'warning',
        message: '선결제 배송정책을 선택한 경우 배송비를 입력해주세요.',
      });
      return;
    }

    // 상품 등록 확인
    showAlert({
      type: 'info',
      message: '상품을 등록하시겠습니까?',
      showCancel: true,
      confirmText: '등록',
      cancelText: '취소',
      onConfirm: async () => {
        // 상품 등록 로직 (실제로는 API 호출)
        const productData = {
          ...formData,
          keywords,
          options,
          additionalOptions,
          optionCombinations,
          mainImages: mainImages.map((file) => file.name),
        };

        console.log('상품 등록:', productData);

        // 비동기 처리 시뮬레이션
        await new Promise((resolve) => setTimeout(resolve, 1000));

        showAlert({
          type: 'success',
          message: '상품이 성공적으로 등록되었습니다.',
        });

        // 폼 초기화
        setFormData({
          customerProductCode: '',
          productName: '',
          keywords: '',
          category: '',
          supplyPrice: '',
          salePrice: '',
          totalQuantity: '',
          productDescription: '',
          shippingPolicy: '',
          shippingFee: '',
        });
        setKeywords([]);
        setOptions([]);
        setAdditionalOptions([]);
        setMainImages([]);
        setOptionCombinations([]);
        setIsOptionsConfirmed(false);
      },
    });
  };
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">상품 등록</h1>
          <p className="text-muted-foreground">새로운 상품을 등록하세요.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 기본 정보 */}

          {/* 가격 및 수량 정보 */}
        </div>

        {/* 옵션 정보 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 기본 옵션 */}

          {/* 추가 옵션 */}
        </div>

        {/* 옵션 조합 관리 */}

        {/* 이미지 및 상세 정보 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 메인 이미지 */}

          {/* 상품 상세 설명 */}
        </div>

        {/* 저장 버튼 */}
      </form>
    </div>
  );
};
