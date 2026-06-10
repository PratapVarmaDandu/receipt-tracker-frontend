export interface StoreLocation {
  id: string;
  name: string;
  description?: string;
  phoneNumber?: string;
  logoUrl?: string;
  address?: string;
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
}

export interface CartItem {
  variationId: string;
  itemId: string;
  itemName: string;
  variationName: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
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
