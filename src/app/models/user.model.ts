export interface User {
  id: number;
  name: string;
  email: string;
  picture: string;
  authenticated: boolean;
  welcomeDismissed: boolean;
  storageConfigured: boolean;
  platformAdmin: boolean;
  /** True exactly once, on the /api/auth/me response(s) right after a brand-new account's first login. */
  isNewUser?: boolean;
}
