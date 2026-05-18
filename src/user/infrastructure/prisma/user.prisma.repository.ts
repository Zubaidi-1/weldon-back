import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserProfile } from 'src/generated/prisma/client';
import { UserProfileDto } from 'src/user/application/dto/userProfile.dto';
import { UserEntity } from 'src/user/domain/entities/user.entity';
import { IUserRepository } from 'src/user/domain/repositories/user.repository';

@Injectable()
export class UserPrismaRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async createUser(user: UserEntity): Promise<UserEntity> {
    const created = await this.prisma.user.create({
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        password: user.password!,
        phoneNumber: user.number,
      },
    });
    const createdUser = new UserEntity(
      created.id,
      created.firstName,
      created.lastName,
      created.name,
      created.email,
      created.password,
      created.phoneNumber,
      created.refreshToken,
      created.role,
      created.isVerified,
    );
    return UserEntity.createUserResponse(
      createdUser.id!,
      createdUser.email,
      createdUser.firstName,
      createdUser.lastName,
      createdUser.name,
      createdUser.number,
      created.refreshToken ?? undefined,
      createdUser.role,
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
    token: string | null,
  ): Promise<Partial<UserEntity> | null> {
    return await this.prisma.user.update({
      where: { email },
      data: { refreshToken: token },
    });
  }

  async getCartProductsCount(userId: number): Promise<number> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: {
        items: {
          select: {
            quantity: true,
          },
        },
      },
    });

    return (
      cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0
    );
  }

  async getUserProfile(userId: number): Promise<UserProfile | null> {
    return await this.prisma.userProfile.findUnique({
      where: { userId },
    });
  }

  async upsertUserProfile(
    userId: number,
    profile: UserProfileDto,
  ): Promise<UserProfile> {
    return await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...profile,
      },
      update: profile,
    });
  }
}
