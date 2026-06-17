export interface ImmOrg {
  id: number;
  name: string;
  orgType: 'EMPLOYER' | 'LAW_FIRM';
  ownerUserId: number;
  createdAt: string;
}

export interface ImmOrgMember {
  id: number;
  immOrgId: number;
  userId: number | null;
  email: string;
  role: 'OWNER' | 'MEMBER';
  status: 'PENDING' | 'ACTIVE' | 'REMOVED';
  inviteToken?: string | null;
}

export interface OrgPartnership {
  id: number;
  employerOrgId: number;
  employerOrgName: string;
  lawFirmOrgId: number;
  lawFirmOrgName: string;
  status: 'PENDING' | 'ACTIVE' | 'ENDED';
  createdAt: string;
}

export interface CreateImmOrgRequest { name: string; orgType: string; }
export interface InviteMemberRequest { email: string; }
export interface CreatePartnershipRequest { employerOrgId: number; lawFirmOrgId: number; }
