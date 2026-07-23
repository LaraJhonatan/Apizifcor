import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { WompiService } from '../wompi/wompi.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckoutDto } from './dto/checkout.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly wompi: WompiService,
  ) {}

  private getUsuarioId(req: any): number {
    const user = req.user;
    if (!user || user.tipo !== 'usuario' || !user.usuarioId) {
      throw new ForbiddenException('Esta acción solo está disponible para usuarios.');
    }
    return Number(user.usuarioId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  checkout(@Request() req: any, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(this.getUsuarioId(req), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findMine(@Request() req: any) {
    return this.ordersService.findMine(this.getUsuarioId(req));
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.getById(id, this.getUsuarioId(req));
  }

  /**
   * Webhook de Wompi — sin JwtAuthGuard (Wompi no manda un token de usuario).
   * Se protege verificando la firma del payload con el secreto de eventos.
   */
  @Post('wompi/webhook')
  @HttpCode(HttpStatus.OK)
  async wompiWebhook(@Body() payload: any) {
    if (this.wompi.verifyEventSignature(payload)) {
      await this.ordersService.handleWompiEvent(payload);
    }
    // Wompi solo espera 200 OK. Si la firma no es válida, el evento se ignora
    // en silencio (no conviene revelar el motivo a quien no sea Wompi).
    return { received: true };
  }
}
