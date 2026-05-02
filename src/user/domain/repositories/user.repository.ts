import { UserEntity } from '../entities/user.entity';

export interface IUserRepository {
  createUser(user: UserEntity): Promise<UserEntity>;
  verifyUser(email: string): Promise<Partial<UserEntity>>;
  findUser(email: string): Promise<Partial<UserEntity> | null>;
  storeUserRefresh(
    email: string,
    token: string,
  ): Promise<Partial<UserEntity> | null>;
}
