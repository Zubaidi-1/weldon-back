import { UserEntity } from '../entities/user.entity';
import { UserProfileDto } from 'src/user/application/dto/userProfile.dto';
import { UserProfile } from 'src/generated/prisma/client';

export interface IUserRepository {
  createUser(user: UserEntity): Promise<UserEntity>;
  verifyUser(email: string): Promise<Partial<UserEntity>>;
  findUser(email: string): Promise<Partial<UserEntity> | null>;
  storeUserRefresh(
    email: string,
    token: string | null,
  ): Promise<Partial<UserEntity> | null>;
  getCartProductsCount(userId: number): Promise<number>;
  getUserProfile(userId: number): Promise<UserProfile | null>;
  upsertUserProfile(
    userId: number,
    profile: UserProfileDto,
  ): Promise<UserProfile>;
}
