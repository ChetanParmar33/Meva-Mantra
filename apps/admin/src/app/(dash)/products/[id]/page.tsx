import { Suspense } from 'react';
import { ProductEdit } from '@/components/product-edit';
import { Skeleton } from '@/components/ui';

// The product id is only known at request time, so the client part reads it under Suspense.
export default function EditProductPage() {
  return <Suspense fallback={<Skeleton className="h-96" />}><ProductEdit /></Suspense>;
}
