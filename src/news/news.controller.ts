import { Controller, Get, Param, Query } from "@nestjs/common";
import { NewsService } from "./news.service";

@Controller('news')
export class NewsController {
  constructor(private readonly service: NewsService) { }

  @Get('/terbaru')
  findAll(@Query('page') page = 1, @Query('limit') limit = 10, @Query('networkId') networkId = 2) {
    return this.service.findAll(+page, +limit, +networkId);
  }

  @Get('/headline')
  findHeadline(@Query('networkId') networkId = 2) {
    return this.service.findHeadline(+networkId);
  }

  @Get('/popular')
  findPopular(@Query('page') page = 1, @Query('limit') limit = 10, @Query('networkId') networkId = 2, @Query('categoryId') categoryId?: number) {
    return this.service.findPopular(+page, +limit, +networkId, categoryId ? +categoryId : undefined);
  }

  @Get('/:id')
  findOne(@Param('id') id: number) {
    return this.service.findOne(+id);
  }

}
