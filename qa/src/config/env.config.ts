import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const ENV = {
  BASE_URL: process.env.BASE_URL || 'http://localhost:8080',
  API_URL: (process.env.API_URL || 'http://localhost:8080/api/v1').replace(/\/?$/, '/'),
} as const;
