import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { useRouter } from 'next/router';

type Props = {
  submitClassName?: string;
  cancelTitle?: string;
  submitTitle?: string;
  backUrl?: string;
  onSubmit: () => void;
};

export const ProductSubmitButton = ({ submitTitle, cancelTitle, submitClassName, backUrl, onSubmit }: Props) => {
  const router = useRouter();

  const onBack = () => {
    if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  // <div className="flex justify-end gap-4">
  <div className={submitClassName ?? ''}>
    <Button type="button" variant="outline" onClick={onBack}>
      {cancelTitle ?? '취소'}
    </Button>
    <Button type="submit" onSubmit={onSubmit}>
      <Save className="h-4 w-4 mr-2" />
      {submitTitle ?? '저장'}
    </Button>
  </div>;
};
