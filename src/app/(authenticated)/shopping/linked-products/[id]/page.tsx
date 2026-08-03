import { MallLinkedProductEditLayout } from '@/features/mallLinkedProduct/ui/[id]/MallLinkedProductEditLayout';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MallLinkedProductEditPage({ params }: Props) {
  const { id } = await params;
  return <MallLinkedProductEditLayout id={id} />;
}
