import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { CategoryService } from "./categories.service";
import { ApiKeyGuard } from "src/auth/api-key.guard";

@Controller('kanal')
@UseGuards(ApiKeyGuard)
export class CategoryController {
    constructor(private readonly service: CategoryService) { }

    @Get('/')
    async findAll(@Query('networkSlug') networkSlug = 'malang') {
        const data = await this.service.findAll(networkSlug);
        return {
            success: true,
            data,
        };
    }

    @Get('/category-news')
    async findKanalNews(@Query('networkSlug') networkSlug: string) {
        const data = await this.service.findAllCategoryWithNews(networkSlug);

        return {
            success: true,
            data
        }
    }

    @Get('/detail/:slug')
    async findDetailCategoryBySlug(@Param('slug') catSlug: string) {
        const data = await this.service.findDetailCategory(catSlug)
        return {
            success: true,
            data,
        };
    }


}
