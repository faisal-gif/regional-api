import { Controller, Get, Param, Query } from "@nestjs/common";
import { FocusService } from "./fokus.services";

@Controller('fokus')
export class FocusController {
    constructor(private readonly service: FocusService) { }

    @Get('/')
    findAll(@Query('networkSlug') networkSlug = 'malang') {
        return this.service.findAll(networkSlug);
    }


}
