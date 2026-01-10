import { relations } from 'drizzle-orm';
import { users, accounts, sessions, streams, clips, exports, userSettings } from './schema';

// User relations
export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  streams: many(streams),
  clips: many(clips),
  exports: many(exports),
  settings: one(userSettings),
}));

// Account relations
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// Session relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Stream relations
export const streamsRelations = relations(streams, ({ one, many }) => ({
  user: one(users, {
    fields: [streams.userId],
    references: [users.id],
  }),
  clips: many(clips),
  exports: many(exports),
}));

// Clip relations
export const clipsRelations = relations(clips, ({ one }) => ({
  stream: one(streams, {
    fields: [clips.streamId],
    references: [streams.id],
  }),
  user: one(users, {
    fields: [clips.userId],
    references: [users.id],
  }),
}));

// Export relations
export const exportsRelations = relations(exports, ({ one }) => ({
  stream: one(streams, {
    fields: [exports.streamId],
    references: [streams.id],
  }),
  user: one(users, {
    fields: [exports.userId],
    references: [users.id],
  }),
}));

// User Settings relations
export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));
