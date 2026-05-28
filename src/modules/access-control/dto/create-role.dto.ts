import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'sales-executive' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: 'Sales team member with controlled access' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @ApiProperty({ type: [String], example: ['read:sales.leads', 'write:sales.leads'] })
  @IsArray()
  @IsString({ each: true })
  permissionKeys!: string[];
}
