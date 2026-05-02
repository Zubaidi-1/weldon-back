import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserEntity } from 'src/user/domain/entities/user.entity';
import { IUserRepository } from 'src/user/domain/repositories/user.repository';

@Injectable()
export class UserPrismaRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async createUser(user: UserEntity): Promise<UserEntity> {
    const created = await this.prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: user.password!,
        phoneNumber: user.number,
      },
    });
    const createdUser = new UserEntity(
      created.id,
      created.name,
      created.email,
      created.password,
      created.phoneNumber,
      created.isVerified,
    );
    return UserEntity.createUserResponse(
      createdUser.id!,
      createdUser.email,
      createdUser.name,
      createdUser.number,
      createdUser.isVerified,
    );
  }

  // This function is to verify the user
  async verifyUser(email: string) {
    return await this.prisma.user.update({
      where: { email: email },
      data: {
        isVerified: true,
      },
    });
  }

  // find user by email
  async findUser(email: string) {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async storeUserRefresh(
    email: string,
    token: string,
  ): Promise<Partial<UserEntity> | null> {
    return await this.prisma.user.update({
      where: { email },
      data: { refreshToken: token },
    });
  }
}
