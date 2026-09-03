import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Auth } from '../auth/decorators/auth.decorator';

@ApiTags('Dashboard')
@Auth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('sales-stats')
  getSalesStats() {
    return this.dashboardService.getSalesStats();
  }
}
