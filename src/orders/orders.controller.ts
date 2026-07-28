import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  Response,
  ForbiddenException,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { OrdersService } from './orders.service';
import { WompiService } from '../wompi/wompi.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckoutDto } from './dto/checkout.dto';
import { CreateManualOrderDto, MarcarPagadaDto, UpdateManualOrderDto } from './dto/manual-order.dto';

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

  private getEmpresaId(req: any): string {
    const user = req.user;
    if (!user || user.tipo !== 'empresa' || !user.empresaId) {
      throw new ForbiddenException('Esta acción solo está disponible para empresas.');
    }
    return user.empresaId;
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
  @Get('manual')
  findManualForEmpresa(@Request() req: any) {
    return this.ordersService.findManualForEmpresa(this.getEmpresaId(req));
  }

  @UseGuards(JwtAuthGuard)
  @Post('manual')
  createManual(@Request() req: any, @Body() dto: CreateManualOrderDto) {
    return this.ordersService.createManual(this.getEmpresaId(req), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('manual/:id')
  updateManual(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateManualOrderDto,
  ) {
    return this.ordersService.updateManual(id, this.getEmpresaId(req), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('manual/:id/pagar')
  marcarPagadaManual(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarcarPagadaDto,
  ) {
    return this.ordersService.marcarPagadaManual(id, this.getEmpresaId(req), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/comprobante')
  async getComprobante(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Response() res: ExpressResponse,
  ) {
    const user = req.user;
    const requester =
      user?.tipo === 'empresa'
        ? { tipo: 'empresa' as const, empresaId: user.empresaId }
        : { tipo: 'usuario' as const, usuarioId: this.getUsuarioId(req) };

    const order = await this.ordersService.getOrderForComprobante(id, requester);
    const pdf = await this.ordersService.generarComprobante(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="comprobante-${id.slice(0, 8)}.pdf"`);
    res.send(pdf);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.getById(id, this.getUsuarioId(req));
  }

  @Post('wompi/webhook')
  @HttpCode(HttpStatus.OK)
  async wompiWebhook(@Body() payload: any) {
    if (this.wompi.verifyEventSignature(payload)) {
      await this.ordersService.handleWompiEvent(payload);
    }

    return { received: true };
  }
}
