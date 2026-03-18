import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreatePriceAlertDto } from "./dto/create-price-alert.dto";
import { UpdatePriceAlertDto } from "./dto/update-price-alert.dto";
import { PriceAlertsService } from "./price-alerts.service";

@ApiTags("price-alerts")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller("me/price-alerts")
export class PriceAlertsController {
  constructor(private readonly priceAlertsService: PriceAlertsService) {}

  @Get()
  list(@Req() req: Request) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user;
    return this.priceAlertsService.listByUser(user.sub);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreatePriceAlertDto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user;
    return this.priceAlertsService.create(user.sub, dto);
  }

  @Patch(":id")
  update(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdatePriceAlertDto,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user;
    return this.priceAlertsService.update(user.sub, id, dto);
  }

  @Delete(":id")
  remove(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user;
    return this.priceAlertsService.delete(user.sub, id);
  }
}

