import { Suspense } from 'react';
import { OrderDetail } from '@/components/order-detail';
import { Skeleton } from '@/components/ui';

// The order number is only known at request time, so the client part reads it under Suspense.
export default function OrderPage() {
  return <Suspense fallback={<Skeleton className="h-96" />}><OrderDetail /></Suspense>;
}
