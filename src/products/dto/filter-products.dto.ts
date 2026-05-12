import { IsOptional, IsUUID, IsEnum, IsString } from 'class-validator';
import { ProductStatus } from '../../common/enums/product-status.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterProductsDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  empresaId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  subcategoryId?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  estado?: ProductStatus;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  marca?: string;
}