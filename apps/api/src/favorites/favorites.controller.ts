import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { FavoritesService } from "./favorites.service";

@ApiTags("favorites")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller("me/favorites")
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  list(@Req() req: Request) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user;
    return this.favoritesService.listByUser(user.sub);
  }

  @Post()
  add(@Req() req: Request, @Body("productId", ParseIntPipe) productId: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user;
    return this.favoritesService.addFavorite(user.sub, productId);
  }

  @Delete(":productId")
  remove(@Req() req: Request, @Param("productId", ParseIntPipe) productId: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user;
    return this.favoritesService.removeFavorite(user.sub, productId);
  }
}

