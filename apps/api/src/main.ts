import { identify, accounts } from './modules/gobierno/identity';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'MVP DEMO: autenticación y políticas de autorización no implementadas. No desplegar en producción.',
    );
  }
  const app = await NestFactory.create(AppModule);
  accounts();
  app.use(identify);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 5200), '0.0.0.0');
  console.log(
    'SGTL demo API en http://localhost:' + (process.env.PORT || 5200) + '/api',
  );
}
bootstrap();
