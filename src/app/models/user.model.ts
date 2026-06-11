export interface User {
  id: number;
  name: string;
  email: string;
  picture: string;
  authenticated: boolean;
  welcomeDismissed: boolean;
  storageConfigured: boolean;
  platformAdmin: boolean;
}
