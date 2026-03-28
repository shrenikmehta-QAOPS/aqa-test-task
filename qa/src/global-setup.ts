import { request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { appConfig } from './config/app.config';
import { TestDataHelper } from './helpers/test-data.helper';

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
  const suffix = TestDataHelper.randomSuffix();
  return {
    username: `${prefix}_${suffix}`,
    email: `${prefix}_${suffix}@${appConfig.testData.emailDomain}`,
    password: TestDataHelper.testPassword(),
  };
}

async function registerUser(ctx: Awaited<ReturnType<typeof request.newContext>>, user: UserCred): Promise<void> {
  const resp = await ctx.post('register', {
    data: { username: user.username, email: user.email, password: user.password },
  });
  const status = resp.status();
  if (status === 429) {
    await new Promise((r) => setTimeout(r, appConfig.timeouts.globalSetupRateLimitMs));
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
  const ctx = await request.newContext({ baseURL: appConfig.apiUrl });

  const state: SharedTestState = {
    testUser: uniqueUser(appConfig.testData.usernamePrefix),
  };

  await registerUser(ctx, state.testUser);
  await ctx.dispose();

  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export function readState(): SharedTestState {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as SharedTestState;
}
