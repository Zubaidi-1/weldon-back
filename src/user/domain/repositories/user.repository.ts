import { UserEntity } from '../entities/user.entity';
import { UserProfileDto } from 'src/user/application/dto/userProfile.dto';
import type { User, Order } from 'src/generated/prisma/client';

export type UserWithOrders = User & {
  orders: Order[];
};

export type UserListItem = Omit<
  User,
  'password' | 'refreshToken' | 'tokenVersion'
>;

export type PaginatedUsers = {
  users: UserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    totalUsers: number;
    totalAdmins: number;
    totalVerified: number;
    totalBanned: number;
  };
};

export type UserSearchParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'ADMIN' | 'USER';
  banStatus?: 'ACTIVE' | 'BANNED';
  verificationStatus?: 'VERIFIED' | 'UNVERIFIED';
};

export type ResetPasswordResult = Pick<User, 'id' | 'email' | 'tokenVersion'>;

export type UserProfileDetails = {
  id: number | null;
  userId: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  governate: string;
  address: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export interface IUserRepository {
  createUser(user: UserEntity): Promise<UserEntity>;
  verifyUser(email: string): Promise<Partial<UserEntity>>;
  findUser(email: string): Promise<User | null>;
  storeUserRefresh(
    email: string,
    token: string | null,
  ): Promise<Partial<UserEntity> | null>;
  invalidateUserTokens(email: string): Promise<ResetPasswordResult>;
  getCartProductsCount(userId: number): Promise<number>;
  getUserProfile(userId: number): Promise<UserProfileDetails | null>;
  upsertUserProfile(
    userId: number,
    profile: UserProfileDto,
  ): Promise<UserProfileDetails>;

  getUserOrders(email: string): Promise<UserWithOrders[]>;
  banUser(userToBan: number): Promise<boolean>;
  getAllUsers(params?: UserSearchParams): Promise<PaginatedUsers>;
  resetPassword(email: string, password: string): Promise<ResetPasswordResult>;
}
