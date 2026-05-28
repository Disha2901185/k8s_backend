import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { HealthService } from 'src/modules/health/health.service';

@ApiTags('Health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health Check' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-03-26T00:00:00.000Z',
        services: {
          database: 'up',
        },
      },
    },
  })
  check() {
    return this.healthService.check();
  }
}
