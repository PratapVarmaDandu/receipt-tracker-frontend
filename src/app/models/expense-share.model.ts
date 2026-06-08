export type ShareStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DENIED'
  | 'CHANGE_REQUESTED'
  | 'CHANGE_APPROVED'
  | 'CHANGE_REJECTED';

export interface ExpenseShare {
  id: number;
  receiptId: number;
  storeName: string;
  inviteeEmail: string;
  inviteeLinked: boolean;
  shareAmount: number;
  counterAmount: number | null;
  shareNote: string | null;
  counterNote: string | null;
  changeResponseNote: string | null;
  status: ShareStatus;
  inviteToken: string;
  splitType: string | null;
  paidForOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShareViewData {
  storeName: string;
  ownerName: string;
  receiptTotal: number;
  shareAmount: number;
  counterAmount: number | null;
  purchaseDateTime: string;
  status: ShareStatus;
  shareNote: string | null;
  counterNote: string | null;
  changeResponseNote: string | null;
  splitType: string | null;
  paidForOwner: boolean;
  items: ShareReceiptItem[];
  inviteeLinkNeeded: boolean;
  assignedItems?: ExpenseShareItemDTO[];
  itemSubtotal?: number;
  itemTax?: number;
}

export interface ShareReceiptItem {
  id: number;
  name: string;
  description: string | null;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  category: string | null;
  taxable: boolean;
}

export interface ExpenseShareItemDTO {
  receiptItemId: number;
  itemName: string;
  itemTotal: number;
  taxAmount: number;
  taxRate: number;
  taxable: boolean;
}

export interface ItemAssignment {
  email: string;
  itemIds: number[];
}

export interface CreateShareRequest {
  splitType: 'EQUAL' | 'CUSTOM' | 'ITEM_BASED' | 'PAID_FOR_ME';
  invitees?: ShareInviteeInput[];
  itemAssignments?: ItemAssignment[];
}

export interface ShareInviteeInput {
  email: string;
  amount: number | null;
}
