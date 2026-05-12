import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProductStatus } from '../../common/enums/product-status.enum';

export class ChangeProductStatusDto {
  @IsEnum(ProductStatus)
  estado: ProductStatus;

  @IsOptional()
  @IsString()
  motivo?: string;
}