import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { ReviewsModule } from './reviews/reviews.module';
import { QuotesModule } from './quotes/quotes.module';
import { ContactModule } from './contact/contact.module';
import { UploadsModule } from './uploads/uploads.module';
import { SectoresModule } from './sectores/sectores.module';
import { PublicModule } from './public/public.module';

import { EmpresaEntity } from './auth/entities/empresa.entity';
import { CuentaEmpresaEntity } from './auth/entities/cuenta-empresa.entity';
import { OtpEntity } from './auth/entities/otp.entity';
import { EmpresaProfileEntity } from './auth/entities/empresa-profile.entity';
import { SectorEntity } from './sectores/entities/sector.entity';
import { ProductSector } from './sectores/entities/product-sector.entity';
import { EmpresaSector } from './sectores/entities/empresa-sector.entity';

import { User } from './users/entities/user.entity';
import { Cart } from './cart/entities/cart.entity';
import { Order } from './orders/entities/order.entity';
import { Review } from './reviews/entities/review.entity';
import { Quote } from './quotes/entities/quote.entity';
import { Contact } from './contact/entities/contact.entity';
import { SolicitudMaquinaria } from './contact/entities/solicitud-maquinaria.entity';

import { Category } from './categories/entities/category.entity';
import { CategoryAttributeDefinition } from './categories/entities/category-attribute-definition.entity';
import { CategoryAttributeOption } from './categories/entities/category-attribute-option.entity';

import { Product } from './products/entities/product.entity';
import { ProductAttributeValue } from './products/entities/product-attribute-value.entity';
import { ProductVariant } from './products/entities/product-variant.entity';
import { ProductVariantAttributeValue } from './products/entities/product-variant-attribute-value.entity';
import { ProductImage } from './products/entities/product-image.entity';
import { ProductStatusHistory } from './products/entities/product-status-history.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mssql',
      host: process.env.DB_HOST || 'DESKTOP-T39IUVC',
      port: parseInt(process.env.DB_PORT) || 1433,
      username: process.env.DB_USERNAME || 'api_user',
      password: process.env.DB_PASSWORD || 'ApiPassword123!',
      database: process.env.DB_DATABASE || 'NovaIndustriaDB',
      entities: [
        EmpresaEntity,
        CuentaEmpresaEntity,
        OtpEntity,
        EmpresaProfileEntity,
        SectorEntity,
        ProductSector,
        EmpresaSector,
        User,
        Cart,
        Order,
        Review,
        Quote,
        Contact,
        SolicitudMaquinaria,
        Category,
        CategoryAttributeDefinition,
        CategoryAttributeOption,
        Product,
        ProductAttributeValue,
        ProductVariant,
        ProductVariantAttributeValue,
        ProductImage,
        ProductStatusHistory,
      ],
      synchronize: true,
      logging: true,
      options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
      },
    }),
    AuthModule,
    UsersModule,
    UploadsModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    ReviewsModule,
    QuotesModule,
    ContactModule,
    SectoresModule,
    PublicModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}