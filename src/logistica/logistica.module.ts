import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogisticaController } from './logistica.controller';
import { LogisticaService } from './logistica.service';
import { LogisticaVehiculo } from './entities/logistica-vehiculo.entity';
import { LogisticaRuta } from './entities/logistica-ruta.entity';
import { LogisticaTarifa } from './entities/logistica-tarifa.entity';
import { LogisticaServicio } from './entities/logistica-servicio.entity';
import { LogisticaEditor } from './entities/logistica-editor.entity';
import { LogisticaCotizacion } from './entities/logistica-cotizacion.entity';
import { LogisticaAjuste } from './entities/logistica-ajuste.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { WompiModule } from '../wompi/wompi.module';
import { OrdersModule } from '../orders/orders.module';
import { MailService } from '../auth/services/mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LogisticaVehiculo,
      LogisticaRuta,
      LogisticaTarifa,
      LogisticaServicio,
      LogisticaEditor,
      LogisticaCotizacion,
      LogisticaAjuste,
      Order,
      OrderItem,
    ]),
    WompiModule,
    OrdersModule,
  ],
  controllers: [LogisticaController],
  // MailService solo depende de ConfigService (global); se provee aquí para enviar el enlace de la cotización.
  providers: [LogisticaService, MailService],
})
export class LogisticaModule {}
