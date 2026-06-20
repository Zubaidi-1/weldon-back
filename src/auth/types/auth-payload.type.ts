export type AuthPayload = {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  roleName: string;
  isBanned?: boolean;
  tokenVersion: number;
};
