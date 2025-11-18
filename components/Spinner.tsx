import React from 'react';

export const Spinner: React.FC = () => (
  <div className="flex items-center justify-center">
    <div className="relative w-6 h-6">
      <div className="absolute inset-0 border-2 border-purple-500/20 rounded-full"></div>
      <div className="absolute inset-0 border-2 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
    </div>
  </div>
);