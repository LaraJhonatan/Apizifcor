import { IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';

/** Agregar un producto al carrito */
export class AddCartItemDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  cantidad?: number;
}
