import { IsInt, Min, Max } from 'class-validator';

export class UpdateCartItemDto {
  @IsInt()
  @Min(0)
  @Max(1000)
  cantidad: number;
}
