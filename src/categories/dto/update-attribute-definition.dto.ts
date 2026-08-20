import { PartialType } from '@nestjs/swagger';
import { CreateAttributeDefinitionDto } from './create-attribute-definition.dto';

export class UpdateAttributeDefinitionDto extends PartialType(CreateAttributeDefinitionDto) {}
