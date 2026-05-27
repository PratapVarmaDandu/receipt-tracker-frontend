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
  items: ShareReceiptItem[];
  inviteeLinkNeeded: boolean;
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

export interface CreateShareRequest {
  splitType: 'EQUAL' | 'CUSTOM';
  invitees: ShareInviteeInput[];
}

export interface ShareInviteeInput {
  email: string;
  amount: number | null;
}
