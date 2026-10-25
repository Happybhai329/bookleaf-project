import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export function LoadingSpinner({
  message = 'Loading...',
  className = 'py-12',
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <Loader2 className="w-8 h-8 text-navy-600 animate-spin mb-3" />
      <p className="text-sm text-gray-500 font-medium">{message}</p>
    </div>
  );
}
