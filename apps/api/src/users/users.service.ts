import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id }
    });
  }

  updateName(id: number, name: string) {
    return this.prisma.user.update({
      where: { id },
      data: { name }
    });
  }

  updateProfile(id: number, data: { name?: string; phone?: string }) {
    return this.prisma.user.update({
      where: { id },
      data
    });
  }
}

