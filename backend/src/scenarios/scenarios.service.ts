import { Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Scenario, ScenarioMeta } from '@shared/index';

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data', 'scenarios');

@Injectable()
export class ScenariosService {
  private async ensureDataDir(): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  private filePath(id: string): string {
    return path.join(DATA_DIR, `${id}.json`);
  }

  async list(): Promise<ScenarioMeta[]> {
    await this.ensureDataDir();
    const files = await fs.readdir(DATA_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const metas: ScenarioMeta[] = [];
    for (const file of jsonFiles) {
      const raw = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
      const scenario: Scenario = JSON.parse(raw);
      metas.push({
        id: scenario.id,
        name: scenario.name,
        modified: scenario.metadata.modified,
      });
    }

    metas.sort((a, b) => b.modified.localeCompare(a.modified));
    return metas;
  }

  async get(id: string): Promise<Scenario> {
    try {
      const raw = await fs.readFile(this.filePath(id), 'utf-8');
      return JSON.parse(raw);
    } catch {
      throw new NotFoundException(`Scenario ${id} not found`);
    }
  }

  async create(data: Omit<Scenario, 'id' | 'metadata'>): Promise<Scenario> {
    await this.ensureDataDir();
    const now = new Date().toISOString();
    const scenario: Scenario = {
      ...data,
      id: uuidv4(),
      metadata: { created: now, modified: now },
    };
    await fs.writeFile(this.filePath(scenario.id), JSON.stringify(scenario, null, 2), 'utf-8');
    return scenario;
  }

  async update(id: string, data: Omit<Scenario, 'id' | 'metadata'>): Promise<Scenario> {
    const existing = await this.get(id);
    const scenario: Scenario = {
      ...data,
      id: existing.id,
      metadata: {
        created: existing.metadata.created,
        modified: new Date().toISOString(),
      },
    };
    await fs.writeFile(this.filePath(id), JSON.stringify(scenario, null, 2), 'utf-8');
    return scenario;
  }

  async delete(id: string): Promise<void> {
    await this.get(id); // throws if not found
    await fs.unlink(this.filePath(id));
  }
}
