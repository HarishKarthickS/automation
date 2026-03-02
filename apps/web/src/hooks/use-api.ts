import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AutomationDTO, CreateAutomationInput, UpdateAutomationInput, RunDTO, TemplateDTO } from "@automation/shared";
import { apiFetch } from "@/lib/api";

const automationsKeys = {
  all: ["automations"] as const,
  lists: () => [...automationsKeys.all, "list"] as const,
  list: (limit: number, cursor?: string) => [...automationsKeys.lists(), { limit, cursor }] as const,
  details: () => [...automationsKeys.all, "detail"] as const,
  detail: (id: string) => [...automationsKeys.details(), id] as const
};

export function useAutomations(limit: number = 25, cursor?: string) {
  return useQuery({
    queryKey: automationsKeys.list(limit, cursor),
    queryFn: () => apiFetch<{ items: AutomationDTO[]; nextCursor: string | null }>(`/automations?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`, { skipCsrf: true })
  });
}

export function useAutomation(id: string) {
  return useQuery({
    queryKey: automationsKeys.detail(id),
    queryFn: () => apiFetch<{ automation: AutomationDTO }>(`/automations/${id}`, { skipCsrf: true }),
    enabled: !!id
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAutomationInput) => apiFetch<{ automation: AutomationDTO }>("/automations", { method: "POST", body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationsKeys.lists() });
    }
  });
}

export function useUpdateAutomation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAutomationInput) => apiFetch<{ automation: AutomationDTO }>(`/automations/${id}`, { method: "PUT", body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: automationsKeys.lists() });
    }
  });
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiFetch(`/automations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationsKeys.lists() });
    }
  });
}

export function useTriggerAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiFetch<{ runId: string }>(`/automations/${id}/trigger`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: runsKeys.lists() });
    }
  });
}

const runsKeys = {
  all: ["runs"] as const,
  lists: () => [...runsKeys.all, "list"] as const,
  list: (automationId: string, limit: number, cursor?: string) => [...runsKeys.lists(), { automationId, limit, cursor }] as const,
  details: () => [...runsKeys.all, "detail"] as const,
  detail: (id: string) => [...runsKeys.details(), id] as const
};

export function useRuns(automationId: string, limit: number = 20, cursor?: string) {
  return useQuery({
    queryKey: runsKeys.list(automationId, limit, cursor),
    queryFn: () => apiFetch<{ items: RunDTO[]; nextCursor: string | null }>(`/automations/${automationId}/runs?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`, { skipCsrf: true }),
    enabled: !!automationId
  });
}

export function useRun(runId: string) {
  return useQuery({
    queryKey: runsKeys.detail(runId),
    queryFn: () => apiFetch<{ run: RunDTO }>(`/runs/${runId}`, { skipCsrf: true }),
    enabled: !!runId
  });
}

const templatesKeys = {
  all: ["templates"] as const,
  lists: () => [...templatesKeys.all, "list"] as const,
  list: (limit: number, cursor?: string, query?: string, sort?: string, tag?: string) => [...templatesKeys.lists(), { limit, cursor, query, sort, tag }] as const,
  details: () => [...templatesKeys.all, "detail"] as const,
  detail: (id: string) => [...templatesKeys.details(), id] as const
};

export function useTemplates(limit: number = 20, cursor?: string, query?: string, sort: "recent" | "popular" = "recent", tag?: string) {
  return useQuery({
    queryKey: templatesKeys.list(limit, cursor, query, sort, tag),
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(limit), sort });
      if (cursor) params.set("cursor", cursor);
      if (query) params.set("query", query);
      if (tag) params.set("tag", tag);
      return apiFetch<{ items: TemplateDTO[]; nextCursor: string | null }>(`/templates?${params}`, { skipCsrf: true });
    }
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: templatesKeys.detail(id),
    queryFn: () => apiFetch<{ template: TemplateDTO }>(`/templates/${id}`, { skipCsrf: true }),
    enabled: !!id
  });
}

export function useCloneTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      nameOverride,
      timezoneOverride
    }: {
      templateId: string;
      nameOverride?: string;
      timezoneOverride?: string;
    }) =>
      apiFetch<{ automationId: string }>(`/templates/${templateId}/clone`, {
        method: "POST",
        body: { nameOverride, timezoneOverride }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationsKeys.lists() });
    }
  });
}

export function usePublishAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiFetch<{ automation: AutomationDTO }>(`/automations/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: templatesKeys.lists() });
    }
  });
}

export function useUnpublishAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ automation: AutomationDTO }>(`/automations/${id}/unpublish`, {
        method: "POST"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: templatesKeys.lists() });
    }
  });
}
