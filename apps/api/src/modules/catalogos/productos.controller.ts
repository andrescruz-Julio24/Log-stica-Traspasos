import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { CatalogosService } from './catalogos.service';
import { CreateCatalogProductDto } from './dto/productos.dto';
import { operator, OperatorRequest } from '../gobierno/identity';

@Controller('products')
export class ProductosController {
  constructor(private readonly service: CatalogosService) {}
  @Post() create(@Body() body: CreateCatalogProductDto,
    @Headers('idempotency-key') key: string | undefined,
    @Req() req: OperatorRequest) {
    return this.service.createProduct(body, key, operator(req, true));
  }
}
