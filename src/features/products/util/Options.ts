import { ProductOption } from '../types/ProductTypes';

export const optionCombinations = (options: ProductOption[]) => {
  console.log('옵션조합', options);
  if (options.length === 0) return [];

  const validOptions = options.filter((opt) => opt.name.trim() && opt.values.trim());
  if (validOptions.length === 0) return [];
};
