import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*', // Allow all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allow specific HTTP methods

  });
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 Server running at http://localhost:${port}`);
}
bootstrap();
