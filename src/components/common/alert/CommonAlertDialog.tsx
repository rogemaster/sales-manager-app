import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CommonAlertDialogProps } from '@/types/CommonInterface';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export function CommonAlertDialog({ open, onOpenChange, options }: CommonAlertDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!options) return null;

  const getIcon = () => {
    switch (options.type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      default:
        return <Info className="h-6 w-6 text-blue-600" />;
    }
  };

  const getTitle = () => {
    if (options.title) return options.title;

    switch (options.type) {
      case 'success':
        return '성공';
      case 'warning':
        return '경고';
      case 'error':
        return '오류';
      default:
        return '알림';
    }
  };

  const handleConfirm = async () => {
    if (options.onConfirm) {
      setIsLoading(true);
      try {
        await options.onConfirm();
      } catch (error) {
        console.error('Alert confirm error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (options.onCancel) {
      options.onCancel();
    }
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">{options.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {options.showCancel && (
            <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
              {options.cancelText || '취소'}
            </AlertDialogCancel>
          )}
          <AlertDialogAction onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? '처리 중...' : options.confirmText || '확인'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
