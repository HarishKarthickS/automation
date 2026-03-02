import { relations } from "drizzle-orm";
import { accounts, automationSecrets, automations, runs, sessions, templates, users } from "./schema.js";

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  automations: many(automations),
  templates: many(templates)
}));

export const automationsRelations = relations(automations, ({ one, many }) => ({
  user: one(users, {
    fields: [automations.userId],
    references: [users.id]
  }),
  secrets: many(automationSecrets),
  runs: many(runs),
  template: many(templates)
}));

export const automationSecretsRelations = relations(automationSecrets, ({ one }) => ({
  automation: one(automations, {
    fields: [automationSecrets.automationId],
    references: [automations.id]
  })
}));

export const runsRelations = relations(runs, ({ one }) => ({
  automation: one(automations, {
    fields: [runs.automationId],
    references: [automations.id]
  })
}));

export const templatesRelations = relations(templates, ({ one }) => ({
  automation: one(automations, {
    fields: [templates.automationId],
    references: [automations.id]
  }),
  owner: one(users, {
    fields: [templates.ownerUserId],
    references: [users.id]
  })
}));

