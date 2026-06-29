export interface ImmOrg {
  id: number;
  name: string;
  orgType: 'EMPLOYER' | 'LAW_FIRM';
  ownerUserId: number;
  createdAt: string;
  myMemberId: number | null;
  // Employer profile fields (null when not yet filled)
  contactName?: string | null;
  contactEmail?: string | null;
  address?: string | null;
  city?: string | null;
  stateCode?: string | null;
  zipCode?: string | null;
  einNumber?: string | null;
  website?: string | null;
}

export interface BarNumber { state: string; barNumber: string; admittedDate?: string; }

export interface AttorneyProfile {
  id: number | null;
  immOrgMemberId: number | null;
  barNumbers: BarNumber[];
  bio: string | null;
  signatureImageKey: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UpdateImmOrgRequest {
  name?: string;
  contactName?: string;
  contactEmail?: string;
  address?: string;
  city?: string;
  stateCode?: string;
  zipCode?: string;
  einNumber?: string;
  website?: string;
}

export interface ImmOrgMember {
  id: number;
  immOrgId: number;
  userId: number | null;
  email: string;
  role: 'OWNER' | 'MEMBER';
  status: 'PENDING' | 'ACTIVE' | 'REMOVED';
  inviteToken?: string | null;
  orgName?: string | null;   // populated only by the public join-info call
}

export interface OrgPartnership {
  id: number;
  employerOrgId: number | null;
  employerOrgName: string;
  lawFirmOrgId: number;
  lawFirmOrgName: string;
  status: 'PENDING' | 'ACTIVE' | 'ENDED';
  createdAt: string;
  inviteEmail?: string | null;
  inviteToken?: string | null;
}

export interface PartnershipJoinInfo {
  partnershipId: number;
  lawFirmOrgId: number;
  lawFirmName: string;
  inviteEmail: string;
  status: string;
}

export interface EmployerOnboardRequest {
  orgName: string;
  contactName: string;
  contactEmail: string;
  address: string;
  city: string;
  stateCode: string;
  zipCode: string;
  einNumber?: string;
  website?: string;
}

export interface CreateImmOrgRequest { name: string; orgType: string; }
export interface InviteMemberRequest { email: string; role: string; }
export interface CreatePartnershipRequest { employerOrgId: number; lawFirmOrgId: number; }
export interface PartnershipInviteRequest { lawFirmOrgId: number; employerEmail: string; }
