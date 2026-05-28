import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadApiCredentialDto } from 'src/modules/auth/dto/lead-api-credential.dto';
import { UserResponseDto } from 'src/modules/user/dto/user-response.dto';

export class TokenResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  accessTokenExpiresIn!: string;

  @ApiProperty()
  refreshTokenExpiresIn!: string;

  @ApiProperty()
  tenantSlug!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;

  @ApiPropertyOptional({ type: LeadApiCredentialDto })
  leadApiCredential?: LeadApiCredentialDto;
}
