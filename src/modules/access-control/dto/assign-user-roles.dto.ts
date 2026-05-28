import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class AssignUserRolesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  roleIds!: string[];
}
