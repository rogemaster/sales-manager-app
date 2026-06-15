import { ShoppingAccountModifyLayout } from '@/features/shoppingAccount/ui/modify/ShoppingAccountModifyLayout';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ShoppingAccountModifyPage({ params }: Props) {
  const { id } = await params;
  return <ShoppingAccountModifyLayout id={id} />;
}
