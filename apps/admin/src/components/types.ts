export type OrderStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'PACKED' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
export const ORDER_STATUSES: OrderStatus[] = ['PENDING_PAYMENT', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'];
/** Mirrors NEXT in apps/api/src/admin/admin-ops.ts (the API enforces it; this only hides invalid buttons). */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'SHIPPED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

export type OrderRow = {
  id: string; number: string; status: OrderStatus; paymentMode: 'PREPAID' | 'COD'; totalPaise: number; createdAt: string;
  itemCount: number; items: { title: string; variantTitle: string; qty: number; productSlug: string | null }[];
  customerName: string; phone: string; city: string;
};
export type OrderList = { items: OrderRow[]; total: number; page: number; pageSize: number; counts?: Partial<Record<OrderStatus, number>> };
