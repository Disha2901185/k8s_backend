import { ApiProperty } from '@nestjs/swagger';

export class LeadApiCredentialDto {
  @ApiProperty()
  clientId!: string;

  @ApiProperty({ nullable: true })
  clientSecret!: string | null;

  @ApiProperty()
  generatedNow!: boolean;
}
