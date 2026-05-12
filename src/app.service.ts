import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      message: 'Nova Industria API v1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
