import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const GUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class ClickProductoDto {
  @ApiProperty()
  @IsString()
  @Matches(GUID_REGEX, { message: 'productId debe ser un identificador válido' })
  productId: string;
}
