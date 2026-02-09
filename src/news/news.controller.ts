import { Controller, Get, Param, Query } from "@nestjs/common";
import { NewsService } from "./news.service";

@Controller('news')
export class NewsController {
  constructor(private readonly service: NewsService) { }

  @Get('/terbaru')
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('networkId') networkId = 2) {

    const data = await this.service.findAll(+page, +limit, +networkId);

    return {
      success: true,
      data,
    };
  }


  @Get('/headline')
  async findHeadline(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('networkId') networkId = 2,
  ) {
    const data = await this.service.findHeadline(+page, +limit, +networkId);

    return {
      success: true,
      data,
    };
  }

  @Get('/popular')
  async findPopular(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('networkId') networkId = 2,
    @Query('categoryId') categoryId?: number) {

    const data = await this.service.findPopular(+page, +limit, +networkId, categoryId ? +categoryId : undefined);

    return {
      success: true,
      data,
    };
  }

  @Get('/category/:cat_id')
  async findByCategory(
    @Param('cat_id') categoryId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('networkId') networkId = 2) {

    const data = await this.service.findByCategory(+page, +limit, +networkId, +categoryId);

    return {
      success: true,
      data,
    };
  }

  @Get('/fokus/:fokus_id')
  async findByFokus(
    @Param('fokus_id') fokusId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('networkId') networkId = 2) {

    const data = await this.service.findByFokus(+page, +limit, +networkId, +fokusId);

    return {
      success: true,
      data,
    };
  }

  @Get('/:code')
  async findOne(@Param('code') code: string) {
    const data = await this.service.findOne(code);

    return {
      success: true,
      data,
    };
  }

  @Get('/search/:query')
  search(@Param('query') query: string, @Query('page') page = 1, @Query('limit') limit = 10, @Query('networkId') networkId = 2) {
    return this.service.search(query, +page, +limit, +networkId);
  }


}
