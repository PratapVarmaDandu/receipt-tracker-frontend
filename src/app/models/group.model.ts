export type GroupRole = 'OWNER' | 'MEMBER';

export interface GroupMember {
  id: number;
  name: string;
  email: string;
  picture: string | null;
  role: GroupRole;
  joinedAt: string;
}

export interface Group {
  id: number;
  name: string;
  ownerName: string;
  inviteToken: string;
  createdAt: string;
  memberCount: number;
  currentUserRole: GroupRole | null;
  members: GroupMember[] | null;
}
