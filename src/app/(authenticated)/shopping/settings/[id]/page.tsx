import { ShoppingSettingModifyLayout } from '@/features/shoppingSetting/ui/[id]/ShoppingSettingModifyLayout';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ShoppingSettingModifyPage({ params }: Props) {
  const { id } = await params;
  return <ShoppingSettingModifyLayout id={id} />;
}
