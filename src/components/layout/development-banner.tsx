'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export function DevelopmentBanner({ config }: { config: { isEnabled: boolean, message: string } }) {
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    // Reset closed state if config changes
    setIsClosed(false);
  }, [config]);

  if (!config?.isEnabled || isClosed) return null;

  return (
    <div className="bg-amber-100 border-b border-amber-200 text-amber-900 px-4 py-2 flex items-center justify-between shadow-sm z-40">
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="w-4 h-4" />
        <span>{config?.message || 'Website under active development.'}</span>
      </div>
      <button 
        onClick={() => setIsClosed(true)} 
        className="text-amber-700 hover:text-amber-900 transition-colors"
        aria-label="Close banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
