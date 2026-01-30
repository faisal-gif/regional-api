import { Controller, Get, Param, Query } from "@nestjs/common";
import { FocusService } from "./fokus.services";

@Controller('fokus')
export class FocusController {
    constructor(private readonly service: FocusService) { }

    @Get('/')
    async findAll(@Query('networkSlug') networkSlug = 'malang',
        @Query('limit') limit = 50) {
        const data = await this.service.findAll(networkSlug, +limit);
        return {
            success: true,
            data,
        };
    }

}
