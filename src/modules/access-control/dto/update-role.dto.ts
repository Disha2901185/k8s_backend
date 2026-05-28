import { PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from 'src/modules/access-control/dto/create-role.dto';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
