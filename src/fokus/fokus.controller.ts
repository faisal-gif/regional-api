import { Controller, Get, Param, Query } from "@nestjs/common";
import { FocusService } from "./fokus.services";

@Controller('fokus')
export class FocusController {
    constructor(private readonly service: FocusService) { }

    @Get('/')
    async findAll(@Query('networkSlug') networkSlug = 'malang') {
        const data = await this.service.findAll(networkSlug);
        return {
            success: true,
            data,
        };
    }

}
