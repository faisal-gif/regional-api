import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { CategoryService } from "./categories.service";
import { ApiKeyGuard } from "src/auth/api-key.guard";

@Controller('kanal')
@UseGuards(ApiKeyGuard) 
export class CategoryController {
    constructor(private readonly service: CategoryService) { }

    @Get('/')
    findAll(@Query('networkSlug') networkSlug = 'malang') {
        return this.service.findAll(networkSlug);
    }

}
