'use client';

import { Suspense } from 'react';
import ShopContent from './ShopContent';

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-[#2A3F35]">Loading collection...</div>}>
      <ShopContent />
    </Suspense>
  );
}