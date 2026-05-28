import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty({ type: [String] })
  roleIds!: string[];

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiProperty({ type: [String] })
  permissions!: string[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Only returned immediately after user creation when the backend provisions a password.',
  })
  temporaryPassword?: string;
}
