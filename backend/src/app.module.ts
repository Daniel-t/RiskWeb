import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ScenariosModule } from './scenarios/scenarios.module';

@Module({
  imports: [ScenariosModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
