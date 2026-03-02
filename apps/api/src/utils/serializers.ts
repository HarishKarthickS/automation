import type { AutomationDTO, RunDTO, SecretDTO, TemplateDTO } from "@automation/shared";

export function toAutomationDTO(row: any): AutomationDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    code: row.code,
    runtime: row.runtime,
    cronExpr: row.cronExpr,
    timezone: row.timezone,
    nextRunAt: row.nextRunAt.toISOString(),
    lastRunAt: row.lastRunAt ? row.lastRunAt.toISOString() : null,
    timeoutSeconds: row.timeoutSeconds,
    enabled: row.enabled,
    tags: row.tags ?? [],
    isTemplatePublished: row.isTemplatePublished,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    cloneCount: row.cloneCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function toSecretDTO(row: any): SecretDTO {
  return {
    id: row.id,
    key: row.key,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function toRunDTO(row: any): RunDTO {
  return {
    id: row.id,
    automationId: row.automationId,
    status: row.status,
    attempt: row.attempt,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    durationMs: row.durationMs,
    output: row.output,
    error: row.error,
    exitCode: row.exitCode,
    triggeredBy: row.triggeredBy
  };
}

export function toTemplateDTO(row: any): TemplateDTO {
  return {
    id: row.template.id,
    automationId: row.template.automationId,
    ownerUserId: row.template.ownerUserId,
    ownerName: row.ownerName,
    name: row.template.name,
    description: row.template.description,
    code: row.template.codeSnapshot,
    runtime: row.template.runtime,
    cronExpr: row.template.cronExpr,
    timezone: row.template.timezone,
    timeoutSeconds: row.template.timeoutSeconds,
    tags: row.template.tags,
    cloneCount: row.template.cloneCount,
    publishedAt: row.template.publishedAt.toISOString(),
    updatedAt: row.template.updatedAt.toISOString()
  };
}

