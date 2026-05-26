export type StoreType = 'COSTCO' | 'GAS_STATION' | 'GROCERY' | 'RESTAURANT' | 'PHARMACY' | 'ONLINE' | 'BANK' | 'OTHER';
export type ReceiptDocType = 'PURCHASE' | 'RETURN' | 'INVOICE' | 'BANK_STATEMENT';

export interface ReceiptItem {
  id?: number;
  name: string;
  description?: string;   // transaction date for bank statement items
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  taxable?: boolean;
}

export interface Receipt {
  id?: number;
  storeName: string;
  storeType: StoreType;
  receiptType?: ReceiptDocType;
  purchaseDateTime: string;
  cardType?: string;
  cardBank?: string;
  lastFourDigits?: string;
  paymentCard?: string;
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
  imageFileName?: string;
  uploadedAt?: string;
  items: ReceiptItem[];
  cashbackEarned?: number;
  potentialCashback?: number;
  bestCard?: string;
  bestCardRate?: string;
}

export interface AnalyticsData {
  totalSpending: number;
  totalCashbackEarned: number;
  totalPotentialCashback: number;
  cashbackLeftOnTable: number;
  spendingByCategory: Record<string, number>;
  spendingByCard: Record<string, number>;
  cashbackByCard: Record<string, number>;
  spendingByMonth: Record<string, number>;
  suggestions: CashbackSuggestion[];
  categoryBreakdown: CategoryBreakdown[];
  totalReceipts: number;
  avgReceiptValue: number;
}

export interface CashbackSuggestion {
  category: string;
  displayCategory: string;
  currentCard: string;
  currentCashbackRate: string;
  recommendedCard: string;
  recommendedCashbackRate: string;
  monthlySpending: number;
  additionalMonthlyEarning: number;
  annualSavings: number;
  reason: string;
}

export interface CategoryBreakdown {
  category: string;
  displayName: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  bestCard: string;
  bestCashbackRate: string;
}

export const STORE_TYPE_ICONS: Record<string, string> = {
  COSTCO:      'bi-building',
  GAS_STATION: 'bi-fuel-pump',
  GROCERY:     'bi-basket',
  RESTAURANT:  'bi-cup-hot',
  PHARMACY:    'bi-capsule',
  ONLINE:      'bi-cart',
  BANK:        'bi-bank',
  OTHER:       'bi-receipt'
};

export const STORE_TYPE_LABELS: Record<string, string> = {
  COSTCO:      'Costco',
  GAS_STATION: 'Gas Station',
  GROCERY:     'Grocery',
  RESTAURANT:  'Restaurant',
  PHARMACY:    'Pharmacy',
  ONLINE:      'Online',
  BANK:        'Bank',
  OTHER:       'Other'
};

export const STORE_TYPE_CSS: Record<string, string> = {
  COSTCO:      'costco',
  GAS_STATION: 'gas',
  GROCERY:     'grocery',
  RESTAURANT:  'restaurant',
  PHARMACY:    'pharmacy',
  ONLINE:      'other',
  BANK:        'bank',
  OTHER:       'other'
};
