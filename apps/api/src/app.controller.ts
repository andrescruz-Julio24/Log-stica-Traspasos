import { Controller,Get } from '@nestjs/common';

@Controller()
export class AppController{
  // El health check indica únicamente que la API ha iniciado.
  @Get('health') health(){return {ok:true,mode:'demo',auth:false};}
}
