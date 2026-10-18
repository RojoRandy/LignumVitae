import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { MonthlyFinanceQueryDto } from './dto/monthly-finance.query.dto';

@ApiTags('Dashboard')
@Auth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('sales-stats')
  getSalesStats() {
    return this.dashboardService.getSalesStats();
  }

  // Costos y ganancia: mismo nivel de acceso que gastos y activos.
  @Auth(UserRoles.admin, UserRoles.super_user)
  @Get('monthly-finance')
  getMonthlyFinance(@Query() query: MonthlyFinanceQueryDto) {
    return this.dashboardService.getMonthlyFinance(query.year, query.month);
  }
}
