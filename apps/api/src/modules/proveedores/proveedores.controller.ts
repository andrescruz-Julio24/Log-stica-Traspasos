import { Body, Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { CreateSupplierReceiptDto, InspectSupplierReceiptDto, ReturnBlockedSupplierDto } from './dto/proveedores.dto';
import { operator, OperatorRequest } from '../gobierno/identity';

@Controller('supplier-receipts')
export class ProveedoresController {
  constructor(private readonly service: ProveedoresService) {}
  @Get() list() { return this.service.list(); }
  @Post() create(@Body() body: CreateSupplierReceiptDto, @Headers('idempotency-key') key: string | undefined,
    @Req() req: OperatorRequest) { return this.service.create(body, key, operator(req)); }
  @Post(':id/inspect') inspect(@Param('id') id: string, @Body() body: InspectSupplierReceiptDto,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.inspect(id, body, key, operator(req));
  }
  @Post('lines/:id/return-blocked') returnBlocked(@Param('id') id: string, @Body() body: ReturnBlockedSupplierDto,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.returnBlocked(id, body, key, operator(req, true));
  }
}
@Controller('unit-stocks')
export class UnitStockController {
  constructor(private readonly service: ProveedoresService) {}
  @Get() list() { return this.service.stocks(); }
}
