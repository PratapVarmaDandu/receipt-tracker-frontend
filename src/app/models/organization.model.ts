export interface Organization {
  id: number;
  name: string;
  slug: string;
  plan: 'FREE' | 'PRO';
  status: 'ACTIVE' | 'SUSPENDED';
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  memberCount: number;
  createdAt: string;
  myRole: OrgRole;
  squareConfigured: boolean;
  squareEnvironment: 'SANDBOX' | 'PRODUCTION' | null;
  cloverConfigured: boolean;
  cloverEnvironment: 'SANDBOX' | 'PRODUCTION' | null;
  recentOrderCount: number;
}

export interface OrgMember {
  id: number;
  inviteEmail: string;
  role: OrgRole;
  status: 'PENDING' | 'ACTIVE' | 'REVOKED';
  userName?: string;
  userPicture?: string;
  invitedAt: string;
  joinedAt?: string;
}

export interface OrgSquareConfig {
  applicationId: string | null;
  locationId: string | null;
  environment: 'SANDBOX' | 'PRODUCTION' | null;
  configured: boolean;
}

export interface OrgSquareConfigRequest {
  accessToken: string;
  applicationId: string;
  locationId: string;
  environment: 'SANDBOX' | 'PRODUCTION';
}

export interface OrgCloverConfig {
  merchantId: string | null;
  environment: 'SANDBOX' | 'PRODUCTION' | null;
  configured: boolean;
}

export interface OrgCloverConfigRequest {
  accessToken: string;
  merchantId: string;
  environment: 'SANDBOX' | 'PRODUCTION';
}

export interface OrgOrder {
  id: number;
  squareOrderId: string;
  squarePaymentId: string;
  totalAmount: number;
  storeName: string;
  locationId: string;
  receiptId: number | null;
  status: 'COMPLETED' | 'REFUNDED' | 'CANCELLED';
  placedByName: string;
  placedByEmail: string;
  placedAt: string;
}

export type OrgRole = 'OWNER' | 'ADMIN' | 'STAFF' | 'VIEWER';

export interface CreateOrganizationRequest {
  name: string;
  slug?: string;
}

export interface InviteMemberRequest {
  email: string;
  role: OrgRole;
}
