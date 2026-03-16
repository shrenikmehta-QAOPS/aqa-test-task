import { request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ENV } from './config/env.config';

export const STATE_FILE = path.resolve(__dirname, '..', '.test-state.json');

export interface SharedTestState {
  testUser: UserCred;
}

export interface UserCred {
  username: string;
  email: string;
  password: string;
}

function uniqueUser(prefix: string): UserCred {
  const s = Math.random().toString(36).slice(2, 8);
  return {
    username: `${prefix}_${s}`,
    email: `${prefix}_${s}@test.local`,
    password: `TestP@ss_${s}`,
  };
}

async function registerUser(ctx: Awaited<ReturnType<typeof request.newContext>>, user: UserCred): Promise<void> {
  const resp = await ctx.post('register', {
    data: { username: user.username, email: user.email, password: user.password },
  });
  const status = resp.status();
  if (status === 429) {
    await new Promise((r) => setTimeout(r, 10_000));
    const retry = await ctx.post('register', {
      data: { username: user.username, email: user.email, password: user.password },
    });
    if (retry.status() !== 200) {
      throw new Error(`Failed to register ${user.username}: ${retry.status()}`);
    }
  } else if (status !== 200) {
    throw new Error(`Failed to register ${user.username}: ${status}`);
  }
}

export default async function globalSetup(): Promise<void> {
  const ctx = await request.newContext({ baseURL: ENV.API_URL });

  const state: SharedTestState = {
    testUser: uniqueUser('test'),
  };

  await registerUser(ctx, state.testUser);
  await ctx.dispose();

  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export function readState(): SharedTestState {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as SharedTestState;
}
