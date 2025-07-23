import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";
import { Network } from "./network.entity";


@Injectable()
export class NetworkService {
    constructor(@InjectRepository(Network) private repo: Repository<Network>) { }

    async findAll() {
        return this.repo.findOne({
            where: { slug: 'jatim' },
            select: {
                id: true,
                name: true,
                slug: true,
                title: true,
            }
        });
    }

}
