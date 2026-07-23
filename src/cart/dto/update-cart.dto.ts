import { IsInt, Min, Max } from 'class-validator';

/** Cambiar la cantidad de una línea del carrito */
export class UpdateCartItemDto {
  @IsInt()
  @Min(0)
  @Max(1000)
  cantidad: number;
}
