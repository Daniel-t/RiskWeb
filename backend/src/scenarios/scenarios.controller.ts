import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ScenariosService } from './scenarios.service';
import type { Scenario, ScenarioMeta } from '@shared/index';

@Controller('scenarios')
export class ScenariosController {
  constructor(private readonly scenariosService: ScenariosService) {}

  @Get()
  list(): Promise<ScenarioMeta[]> {
    return this.scenariosService.list();
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<Scenario> {
    return this.scenariosService.get(id);
  }

  @Post()
  create(@Body() body: Omit<Scenario, 'id' | 'metadata'>): Promise<Scenario> {
    return this.scenariosService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Omit<Scenario, 'id' | 'metadata'>): Promise<Scenario> {
    return this.scenariosService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string): Promise<void> {
    return this.scenariosService.delete(id);
  }
}
