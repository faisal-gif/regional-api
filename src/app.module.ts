import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { News } from './news/news.entity';
import { NewsController } from './news/news.controller';
import { NewsService } from './news/news.service';
import { NewsNetwork } from './news_network/news.entity';
import { Category } from './categories/categories.entity';
import { CategoryController } from './categories/categories.controller';
import { CategoryService } from './categories/categories.service';
import { Focus } from './fokus/fokus.entity';
import { FocusController } from './fokus/fokus.controller';
import { FocusService } from './fokus/fokus.services';
import { Network } from './network/network.entity';


@Module({

  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forFeature([News, NewsNetwork, Category, Focus, Network]),
    TypeOrmModule.forRoot({
      type: 'mysql', // Ganti dari 'postgres' ke 'mysql'
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [News, NewsNetwork, Category, Focus, Network], // Pastikan entitas yang digunakan sesuai
      synchronize: false, // ⛔ Jangan ubah struktur DB otomatis
      migrationsRun: false, // ⛔ Jangan jalankan migration otomatis
    }),
  ],

  controllers: [NewsController, CategoryController, FocusController],
  providers: [NewsService, CategoryService, FocusService],
})
export class AppModule { }
