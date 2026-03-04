import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireAdmin } from "../middleware/requireAdmin.js";
import {
  consumeActionPreflight,
  createActionPreflight,
  deleteAutomationForAdmin,
  deleteEventForAdmin,
  deleteRunForAdmin,
  deleteTemplateForAdmin,
  deleteUserForAdmin,
  getAdminOverview,
  getAutomationByIdForAdmin,
  getRunByIdForAdmin,
  getTemplateByIdForAdmin,
  getUserByIdForAdmin,
  listAdminAuditLogs,
  listAdminAutomations,
  listAdminEvents,
  listAdminOnboarding,
  listAdminRuns,
  listAdminSettings,
  listAdminTemplates,
  listAdminUsers,
  updateAutomationForAdmin,
  updateTemplateForAdmin,
  updateUserForAdmin,
  upsertAdminSetting,
  writeAdminAudit
} from "../services/admin.service.js";

const userParams = z.object({ id: z.string() });
const uuidParams = z.object({ id: z.string().uuid() });
const preflightSchema = z.object({
  action: z.string().min(1),
  resourceType: z.string().min(1),
  resourceId: z.string().min(1),
  reason: z.string().min(3).max(300)
});
const updateUserSchema = z.object({
  role: z.enum(["user", "admin"]).optional(),
  suspended: z.boolean().optional(),
  name: z.string().min(1).max(120).optional(),
  reason: z.string().min(3).max(300).optional()
});
const updateAutomationSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  enabled: z.boolean().optional(),
  reason: z.string().min(3).max(300).optional()
});
const updateTemplateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  isPublished: z.boolean().optional(),
  reason: z.string().min(3).max(300).optional()
});
const upsertSettingSchema = z.object({
  key: z.string().min(1).max(120),
  value: z.string().min(1).max(2000),
  reason: z.string().min(3).max(300)
});

function getPreflightToken(request: FastifyRequest) {
  const header = request.headers["x-admin-action-token"];
  if (Array.isArray(header)) {
    return header[0];
  }
  return typeof header === "string" ? header : undefined;
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAdmin);

  app.get("/admin/overview", async () => {
    return getAdminOverview();
  });

  app.post("/admin/actions/preflight", async (request) => {
    const input = preflightSchema.parse(request.body);
    return createActionPreflight({
      ...input,
      adminUserId: request.authUser!.id
    });
  });

  app.get("/admin/users", async () => ({ items: await listAdminUsers(200) }));
  app.patch("/admin/users/:id", async (request, reply) => {
    const { id } = userParams.parse(request.params);
    const input = updateUserSchema.parse(request.body);
    const before = await getUserByIdForAdmin(id);
    if (!before) {
      reply.code(404).send({ message: "User not found" });
      return;
    }
    const updated = await updateUserForAdmin(id, {
      role: input.role,
      suspended: input.suspended,
      name: input.name
    });
    await writeAdminAudit({
      adminUserId: request.authUser!.id,
      action: "user_update",
      resourceType: "user",
      resourceId: id,
      reason: input.reason ?? "Admin user update",
      before,
      after: updated
    });
    return { user: updated };
  });
  app.delete("/admin/users/:id", async (request, reply) => {
    const { id } = userParams.parse(request.params);
    const preflight = consumeActionPreflight(getPreflightToken(request), {
      action: "user_delete",
      resourceType: "user",
      resourceId: id,
      adminUserId: request.authUser!.id
    });
    if (!preflight.ok) {
      reply.code(403).send({ message: preflight.reason });
      return;
    }
    const before = await getUserByIdForAdmin(id);
    if (!before) {
      reply.code(404).send({ message: "User not found" });
      return;
    }
    const deleted = await deleteUserForAdmin(id);
    await writeAdminAudit({
      adminUserId: request.authUser!.id,
      action: "user_delete",
      resourceType: "user",
      resourceId: id,
      reason: preflight.reason,
      before,
      after: deleted
    });
    reply.code(200).send({ deleted: true });
  });

  app.get("/admin/automations", async () => ({ items: await listAdminAutomations(200) }));
  app.patch("/admin/automations/:id", async (request, reply) => {
    const { id } = uuidParams.parse(request.params);
    const input = updateAutomationSchema.parse(request.body);
    const before = await getAutomationByIdForAdmin(id);
    if (!before) {
      reply.code(404).send({ message: "Automation not found" });
      return;
    }
    const updated = await updateAutomationForAdmin(id, { name: input.name, enabled: input.enabled });
    await writeAdminAudit({
      adminUserId: request.authUser!.id,
      action: "automation_update",
      resourceType: "automation",
      resourceId: id,
      reason: input.reason ?? "Admin automation update",
      before,
      after: updated
    });
    return { automation: updated };
  });
  app.delete("/admin/automations/:id", async (request, reply) => {
    const { id } = uuidParams.parse(request.params);
    const preflight = consumeActionPreflight(getPreflightToken(request), {
      action: "automation_delete",
      resourceType: "automation",
      resourceId: id,
      adminUserId: request.authUser!.id
    });
    if (!preflight.ok) {
      reply.code(403).send({ message: preflight.reason });
      return;
    }
    const before = await getAutomationByIdForAdmin(id);
    if (!before) {
      reply.code(404).send({ message: "Automation not found" });
      return;
    }
    const deleted = await deleteAutomationForAdmin(id);
    await writeAdminAudit({
      adminUserId: request.authUser!.id,
      action: "automation_delete",
      resourceType: "automation",
      resourceId: id,
      reason: preflight.reason,
      before,
      after: deleted
    });
    reply.code(200).send({ deleted: true });
  });

  app.get("/admin/runs", async () => ({ items: await listAdminRuns(200) }));
  app.delete("/admin/runs/:id", async (request, reply) => {
    const { id } = uuidParams.parse(request.params);
    const preflight = consumeActionPreflight(getPreflightToken(request), {
      action: "run_delete",
      resourceType: "run",
      resourceId: id,
      adminUserId: request.authUser!.id
    });
    if (!preflight.ok) {
      reply.code(403).send({ message: preflight.reason });
      return;
    }
    const before = await getRunByIdForAdmin(id);
    if (!before) {
      reply.code(404).send({ message: "Run not found" });
      return;
    }
    const deleted = await deleteRunForAdmin(id);
    await writeAdminAudit({
      adminUserId: request.authUser!.id,
      action: "run_delete",
      resourceType: "run",
      resourceId: id,
      reason: preflight.reason,
      before,
      after: deleted
    });
    reply.code(200).send({ deleted: true });
  });

  app.get("/admin/templates", async () => ({ items: await listAdminTemplates(200) }));
  app.patch("/admin/templates/:id", async (request, reply) => {
    const { id } = uuidParams.parse(request.params);
    const input = updateTemplateSchema.parse(request.body);
    const before = await getTemplateByIdForAdmin(id);
    if (!before) {
      reply.code(404).send({ message: "Template not found" });
      return;
    }
    const updated = await updateTemplateForAdmin(id, { name: input.name, isPublished: input.isPublished });
    await writeAdminAudit({
      adminUserId: request.authUser!.id,
      action: "template_update",
      resourceType: "template",
      resourceId: id,
      reason: input.reason ?? "Admin template update",
      before,
      after: updated
    });
    return { template: updated };
  });
  app.delete("/admin/templates/:id", async (request, reply) => {
    const { id } = uuidParams.parse(request.params);
    const preflight = consumeActionPreflight(getPreflightToken(request), {
      action: "template_delete",
      resourceType: "template",
      resourceId: id,
      adminUserId: request.authUser!.id
    });
    if (!preflight.ok) {
      reply.code(403).send({ message: preflight.reason });
      return;
    }
    const before = await getTemplateByIdForAdmin(id);
    if (!before) {
      reply.code(404).send({ message: "Template not found" });
      return;
    }
    const deleted = await deleteTemplateForAdmin(id);
    await writeAdminAudit({
      adminUserId: request.authUser!.id,
      action: "template_delete",
      resourceType: "template",
      resourceId: id,
      reason: preflight.reason,
      before,
      after: deleted
    });
    reply.code(200).send({ deleted: true });
  });

  app.get("/admin/onboarding", async () => ({ items: await listAdminOnboarding(200) }));
  app.get("/admin/events", async () => ({ items: await listAdminEvents(400) }));
  app.delete("/admin/events/:id", async (request, reply) => {
    const { id } = uuidParams.parse(request.params);
    const preflight = consumeActionPreflight(getPreflightToken(request), {
      action: "event_delete",
      resourceType: "event",
      resourceId: id,
      adminUserId: request.authUser!.id
    });
    if (!preflight.ok) {
      reply.code(403).send({ message: preflight.reason });
      return;
    }
    const deleted = await deleteEventForAdmin(id);
    await writeAdminAudit({
      adminUserId: request.authUser!.id,
      action: "event_delete",
      resourceType: "event",
      resourceId: id,
      reason: preflight.reason,
      before: null,
      after: deleted
    });
    reply.code(200).send({ deleted: true });
  });

  app.get("/admin/audit-logs", async () => ({ items: await listAdminAuditLogs(300) }));
  app.get("/admin/settings", async () => ({ items: await listAdminSettings() }));
  app.patch("/admin/settings", async (request) => {
    const input = upsertSettingSchema.parse(request.body);
    const updated = await upsertAdminSetting(input.key, input.value, request.authUser!.id);
    await writeAdminAudit({
      adminUserId: request.authUser!.id,
      action: "admin_setting_upsert",
      resourceType: "admin_setting",
      resourceId: input.key,
      reason: input.reason,
      before: null,
      after: updated
    });
    return { setting: updated };
  });
};
