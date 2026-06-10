import { IsArray, IsUUID } from 'class-validator';

export class AssignSectoresDto {
  @IsArray()
  @IsUUID('4', { each: true })
  sectorIds: string[];
}