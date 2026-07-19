import { createRequire } from "node:module";
import type { RedisLike } from "./toolkit/session/redis.js";

/**
 * Persistent storage for durable domain data (User, Alert, Subscription).
 * Uses Redis when REDIS_URL is set, in-memory otherwise.
 */

export interface User {
  telegram_chat_id: number;
  prefix: string;
  webhook_token: string;
}

export interface Alert {
  timestamp: number;
  symbol: string;
  message: string;
  custom_fields: Record<string, unknown>;
}

export interface Subscription {
  webhook_token: string;
  telegram_chat_id: number;
}

interface StoreAdapter<T> {
  get(id: string): Promise<T | undefined>;
  set(id: string, value: T): Promise<void>;
  delete(id: string): Promise<void>;
  has(id: string): Promise<boolean>;
}

class InMemoryStore<T> implements StoreAdapter<T> {
  private store = new Map<string, T>();

  async get(id: string): Promise<T | undefined> {
    return this.store.get(id);
  }

  async set(id: string, value: T): Promise<void> {
    this.store.set(id, value);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async has(id: string): Promise<boolean> {
    return this.store.has(id);
  }
}

class RedisStore<T> implements StoreAdapter<T> {
  private client: RedisLike;
  private prefix: string;

  constructor(client: RedisLike, prefix: string) {
    this.client = client;
    this.prefix = prefix;
  }

  private key(id: string): string {
    return `${this.prefix}:${id}`;
  }

  async get(id: string): Promise<T | undefined> {
    const raw = await this.client.get(this.key(id));
    if (raw == null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  async set(id: string, value: T): Promise<void> {
    await this.client.set(this.key(id), JSON.stringify(value));
  }

  async delete(id: string): Promise<void> {
    await this.client.del(this.key(id));
  }

  async has(id: string): Promise<boolean> {
    return (await this.get(id)) !== undefined;
  }
}

interface AlertHistoryAdapter {
  add(chatId: number, alert: Alert): Promise<void>;
  get(chatId: number): Promise<Alert[]>;
  clear(chatId: number): Promise<void>;
}

class InMemoryAlertHistory implements AlertHistoryAdapter {
  private store = new Map<number, Alert[]>();

  async add(chatId: number, alert: Alert): Promise<void> {
    const alerts = this.store.get(chatId) ?? [];
    alerts.unshift(alert);
    if (alerts.length > 10) alerts.length = 10;
    this.store.set(chatId, alerts);
  }

  async get(chatId: number): Promise<Alert[]> {
    return this.store.get(chatId) ?? [];
  }

  async clear(chatId: number): Promise<void> {
    this.store.delete(chatId);
  }
}

class RedisAlertHistory implements AlertHistoryAdapter {
  private client: RedisLike;
  private prefix: string;

  constructor(client: RedisLike, prefix: string) {
    this.client = client;
    this.prefix = prefix;
  }

  private key(chatId: number): string {
    return `${this.prefix}:${chatId}`;
  }

  async add(chatId: number, alert: Alert): Promise<void> {
    const raw = await this.client.get(this.key(chatId));
    const alerts: Alert[] = raw ? JSON.parse(raw) : [];
    alerts.unshift(alert);
    if (alerts.length > 10) alerts.length = 10;
    await this.client.set(this.key(chatId), JSON.stringify(alerts));
  }

  async get(chatId: number): Promise<Alert[]> {
    const raw = await this.client.get(this.key(chatId));
    return raw ? JSON.parse(raw) : [];
  }

  async clear(chatId: number): Promise<void> {
    await this.client.del(this.key(chatId));
  }
}

let usersByChatId: StoreAdapter<User>;
let usersByToken: StoreAdapter<User>;
let subscriptions: StoreAdapter<Subscription>;
let alerts: AlertHistoryAdapter;

function getRedisClient(): RedisLike {
  const require = createRequire(import.meta.url);
  const ioredis: any = require("ioredis");
  const Redis = ioredis.default ?? ioredis.Redis ?? ioredis;
  return new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: false,
  }) as RedisLike;
}

function initStores(client?: RedisLike): void {
  if (client) {
    usersByChatId = new RedisStore<User>(client, "tv:user:chat");
    usersByToken = new RedisStore<User>(client, "tv:user:token");
    subscriptions = new RedisStore<Subscription>(client, "tv:sub");
    alerts = new RedisAlertHistory(client, "tv:alerts");
  } else if (process.env.REDIS_URL) {
    const c = getRedisClient();
    usersByChatId = new RedisStore<User>(c, "tv:user:chat");
    usersByToken = new RedisStore<User>(c, "tv:user:token");
    subscriptions = new RedisStore<Subscription>(c, "tv:sub");
    alerts = new RedisAlertHistory(c, "tv:alerts");
  } else {
    usersByChatId = new InMemoryStore<User>();
    usersByToken = new InMemoryStore<User>();
    subscriptions = new InMemoryStore<Subscription>();
    alerts = new InMemoryAlertHistory();
  }
}

export function getUserByChatId(chatId: number): Promise<User | undefined> {
  if (!usersByChatId) initStores();
  return usersByChatId.get(String(chatId));
}

export async function setUser(chatId: number, user: User): Promise<void> {
  if (!usersByChatId) initStores();
  await usersByChatId.set(String(chatId), user);
}

export async function deleteUser(chatId: number): Promise<void> {
  if (!usersByChatId) initStores();
  await usersByChatId.delete(String(chatId));
}

export function getUserByToken(token: string): Promise<User | undefined> {
  if (!usersByToken) initStores();
  return usersByToken.get(token);
}

export async function setUserToken(token: string, user: User): Promise<void> {
  if (!usersByToken) initStores();
  await usersByToken.set(token, user);
}

export async function deleteUserToken(token: string): Promise<void> {
  if (!usersByToken) initStores();
  await usersByToken.delete(token);
}

export function getSubscription(token: string): Promise<Subscription | undefined> {
  if (!subscriptions) initStores();
  return subscriptions.get(token);
}

export async function setSubscription(token: string, sub: Subscription): Promise<void> {
  if (!subscriptions) initStores();
  await subscriptions.set(token, sub);
}

export async function deleteSubscription(token: string): Promise<void> {
  if (!subscriptions) initStores();
  await subscriptions.delete(token);
}

export async function addAlert(chatId: number, alert: Alert): Promise<void> {
  if (!alerts) initStores();
  await alerts.add(chatId, alert);
}

export async function getAlerts(chatId: number): Promise<Alert[]> {
  if (!alerts) initStores();
  return alerts.get(chatId);
}

export async function clearAlerts(chatId: number): Promise<void> {
  if (!alerts) initStores();
  await alerts.clear(chatId);
}

/** Initialize stores with a custom Redis client (for testing). */
export function initWithClient(client: RedisLike): void {
  initStores(client);
}

/** Reset all stores to fresh in-memory (test-only; never call from bot code). */
export function resetStores(): void {
  usersByChatId = undefined as any;
  usersByToken = undefined as any;
  subscriptions = undefined as any;
  alerts = undefined as any;
}
