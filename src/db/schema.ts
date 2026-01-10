import { pgTable, text, timestamp, uuid, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const platformEnum = pgEnum('platform', ['twitch', 'youtube', 'x', 'other']);
export const clipSourceEnum = pgEnum('clip_source', ['voice', 'hotkey', 'manual', 'api']);
export const exportFormatEnum = pgEnum('export_format', ['plain_text', 'youtube_chapters', 'obsidian_markdown', 'json']);

// Users table (matches NextAuth User model)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// NextAuth Account table
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
});

// NextAuth Session table
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: text('session_token').notNull().unique(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

// NextAuth Verification Token table
export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

// Streams table
export const streams = pgTable('streams', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  platform: platformEnum('platform').notNull().default('other'),
  externalId: text('external_id'), // Twitch/YouTube stream ID
  title: text('title').notNull(),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  isLive: boolean('is_live').notNull().default(false),
  startedAt: timestamp('started_at', { mode: 'date' }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Clips table
export const clips = pgTable('clips', {
  id: uuid('id').primaryKey().defaultRandom(),
  streamId: uuid('stream_id')
    .notNull()
    .references(() => streams.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  timestampMs: integer('timestamp_ms').notNull(), // Milliseconds from stream start
  label: text('label'),
  notes: text('notes'),
  source: clipSourceEnum('source').notNull().default('manual'),
  isProcessed: boolean('is_processed').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Exports table (for tracking export history)
export const exports = pgTable('exports', {
  id: uuid('id').primaryKey().defaultRandom(),
  streamId: uuid('stream_id')
    .notNull()
    .references(() => streams.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  format: exportFormatEnum('format').notNull(),
  filename: text('filename').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// User Settings table
export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  voiceCommandEnabled: boolean('voice_command_enabled').notNull().default(true),
  voiceCommandPhrase: text('voice_command_phrase').notNull().default('clip it'),
  hotkeyEnabled: boolean('hotkey_enabled').notNull().default(true),
  hotkey: text('hotkey').notNull().default('Ctrl+Shift+C'),
  defaultExportFormat: exportFormatEnum('default_export_format').notNull().default('plain_text'),
  obsidianVaultPath: text('obsidian_vault_path'),
  autoSync: boolean('auto_sync').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});
