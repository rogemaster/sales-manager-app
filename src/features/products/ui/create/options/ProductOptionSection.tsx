import { ProductBasicOption } from './ProductBasicOption';
import { ProductSubOption } from './ProductSubOption';

export const ProductOptionSection = () => {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 기본 옵션 */}
      <ProductBasicOption />
      {/* 추가 옵션 */}
      <ProductSubOption />
    </div>
  );
};
