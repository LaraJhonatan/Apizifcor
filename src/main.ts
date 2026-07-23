import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:9000')
    .split(',')
    .map((origin) => origin.trim());

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // El sitemap y robots.txt deben quedar en la raíz, no bajo /api/
  app.setGlobalPrefix('api', {
    exclude: ['sitemap.xml', 'robots.txt'],
  });

  const config = new DocumentBuilder()
    .setTitle('Nova Industria API')
    .setDescription('API para e-commerce industrial')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 API: http://localhost:${port}`);
  console.log(`📚 Docs: http://localhost:${port}/api/docs`);
  console.log(`🗺  Sitemap: http://localhost:${port}/sitemap.xml`);
}

bootstrap();