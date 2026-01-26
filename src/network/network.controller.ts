import { Controller, Get, Param, Query } from "@nestjs/common";
import { NetworkService } from "./network.services";

@Controller('network')
export class NetworkController {
    constructor(private readonly service: NetworkService) { }

    @Get('/:slug')
    async findOne(@Param('slug') slug: string) {

        const data = await this.service.findOne(slug);

        return {
            success: true,
            data,
        };
    }

    


}