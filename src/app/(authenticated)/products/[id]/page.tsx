import { ProductModifyLayout } from '@/features/products/ui/[id]/ProductModifyLayout';

type Props = {
  params: {
    id: string;
  };
};

export default async function ProductModify({ params }: Props) {
  const { id } = await params;
  return <ProductModifyLayout productId={id} />;
}
