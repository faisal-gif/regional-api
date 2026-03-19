import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AdsService } from './ads.service';
import { Ads } from './ads.entity';

@Controller('ads')
export class AdsController {
    constructor(private readonly adsService: AdsService) {}

    
    @Get('network/:netId/testimonials/active')
    async getActiveTestimonials(
        // Menggunakan ParseIntPipe untuk memastikan netId yang masuk dari URL diubah menjadi angka
        @Param('netId', ParseIntPipe) netId: number,
    ): Promise<Ads[]> {
        return await this.adsService.getActiveTestimonialsByNetworkId(netId);
    }
}