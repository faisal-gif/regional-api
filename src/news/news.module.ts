import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { NewsService } from './news.service';

@Module({
  imports: [
    CacheModule.register({
      ttl: 120, // Durasi cache dalam detik (contoh: 10 menit)
      max: 100, // Maksimum jumlah item di cache
    }),
  ],
  providers: [NewsService],
})
export class NewsModule {}