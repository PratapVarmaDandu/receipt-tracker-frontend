export interface StoreLocation {
  id: string;
  name: string;
  description?: string;
  phoneNumber?: string;
  logoUrl?: string;
  address?: string;
  orgSlug?: string;    // set when this location comes from an org's Square or Clover config
  provider?: 'square' | 'clover';  // single-provider orgs
  providers?: ('square' | 'clover')[];  // set when org has BOTH Square + Clover configured
}

export interface SquareVariation {
  id: string;
  name: string;
  price: number;
  currency: string;
  available: boolean;
}

export interface SquareCatalogItem {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  imageUrl?: string;
  variations: SquareVariation[];
  source?: 'square' | 'clover';  // which POS provided this item
}

export interface CartItem {
  variationId: string;
  itemId: string;
  itemName: string;
  variationName: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
  source?: 'square' | 'clover';  // which POS this item belongs to
}

export interface CreateOrderRequest {
  items: CartLineItem[];
  fulfillmentType: 'PICKUP' | 'DELIVERY';
  recipientName: string;
  recipientEmail: string;
  recipientPhone?: string;
  deliveryAddress?: string;
  note?: string;
  sourceId?: string;
  locationId?: string;
}

export interface CartLineItem {
  variationId: string;
  itemName: string;
  variationName: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderResponse {
  squareOrderId: string;
  checkoutUrl: string;
  receiptId: number;
  total: number;
  storeName: string;
}
