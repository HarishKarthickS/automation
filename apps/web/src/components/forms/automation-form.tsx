"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AutomationDTO } from "@automation/shared";
import { automationCreateSchema, automationUpdateSchema } from "@automation/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useCreateAutomation, useUpdateAutomation } from "@/hooks/use-api";
import { toast } from "sonner";
import { Clock, Code, Play, Settings } from "lucide-react";

const SCHEDULE_OPTIONS = [
  { value: "every_5_minutes", label: "Every 5 minutes", cron: "*/5 * * * *" },
  { value: "every_15_minutes", label: "Every 15 minutes", cron: "*/15 * * * *" },
  { value: "every_30_minutes", label: "Every 30 minutes", cron: "*/30 * * * *" },
  { value: "every_2_hours", label: "Every 2 hours", cron: "0 */2 * * *" },
  { value: "hourly", label: "Every hour", cron: "0 * * * *" },
  { value: "daily", label: "Every day (midnight)", cron: "0 0 * * *" },
  { value: "weekdays_morning", label: "Weekdays (9:00 AM)", cron: "0 9 * * 1-5" },
  { value: "weekly", label: "Every week (Sunday)", cron: "0 0 * * 0" },
  { value: "monthly", label: "Every month (1st day)", cron: "0 0 1 * *" }
] as const;

const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney"
];

const IDLE_PROMPT_MS = 30_000;
const AUTOSAVE_COUNTDOWN_SECONDS = 10;

type SaveReason = "manual" | "idle-autosave" | "leave-autosave";
type PromptReason = "idle" | "leave";
type PendingNavigationIntent = { type: "back" } | { type: "href"; href: string } | null;

interface FormPayload {
  name: string;
  description?: string;
  cronExpr: string;
  timezone: string;
  timeoutSeconds: number;
  enabled: boolean;
  code: string;
  runtime: "nodejs20";
  tags: string[];
}

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function serializePayload(payload: FormPayload): string {
  return JSON.stringify(payload);
}

function deriveScheduleState(cronExpr: string): {
  schedule: string;
  dailyTime: string;
  customCron: string;
} {
  const dailyMatch = cronExpr.match(/^(\d{1,2}) (\d{1,2}) \* \* \*$/);
  const schedule =
    SCHEDULE_OPTIONS.find((option) => option.cron === cronExpr)?.value ??
    (dailyMatch ? "daily_at_time" : "custom");
  const dailyTime =
    dailyMatch && !SCHEDULE_OPTIONS.some((option) => option.cron === cronExpr)
      ? `${dailyMatch[2]!.padStart(2, "0")}:${dailyMatch[1]!.padStart(2, "0")}`
      : "09:00";
  const customCron = schedule === "custom" ? cronExpr : "*/5 * * * *";

  return { schedule, dailyTime, customCron };
}

function detectUserTimezone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone || "UTC";
  } catch {
    return "UTC";
  }
}

interface AutomationFormProps {
  mode: "create" | "edit";
  automation?: AutomationDTO;
}

export function AutomationForm({ mode, automation }: AutomationFormProps) {
  const router = useRouter();
  const initialCron = automation?.cronExpr ?? "*/5 * * * *";
  const scheduleState = deriveScheduleState(initialCron);

  const [name, setName] = useState(automation?.name ?? "");
  const [description, setDescription] = useState(automation?.description ?? "");
  const [schedule, setSchedule] = useState<string>(scheduleState.schedule);
  const [customCron, setCustomCron] = useState(
    scheduleState.customCron
  );
  const [dailyTime, setDailyTime] = useState(scheduleState.dailyTime);
  const [timezone, setTimezone] = useState(automation?.timezone ?? "UTC");
  const [timeoutSeconds, setTimeoutSeconds] = useState(automation?.timeoutSeconds ?? 30);
  const [enabled, setEnabled] = useState(automation?.enabled ?? true);
  const [tags, setTags] = useState((automation?.tags ?? []).join(", "));
  const [code, setCode] = useState(
    automation?.code ?? "console.log(`hello from automation at ${new Date().toISOString()}`);"
  );

  const createAutomation = useCreateAutomation();
  const updateAutomation = useUpdateAutomation(automation?.id ?? "");

  const parsedTags = useMemo(
    () => parseTags(tags),
    [tags]
  );

  const timezoneOptions = useMemo(() => {
    const detected =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : undefined;

    let zones = FALLBACK_TIMEZONES;
    if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
      try {
        const supported = (Intl as any).supportedValuesOf("timeZone") as string[];
        if (Array.isArray(supported) && supported.length > 0) {
          zones = supported;
        }
      } catch {
        zones = FALLBACK_TIMEZONES;
      }
    }

    if (detected && !zones.includes(detected)) {
      zones = [detected, ...zones];
    }

    return zones;
  }, []);

  useEffect(() => {
    if (mode !== "create" || automation?.timezone) {
      return;
    }
    const detected = detectUserTimezone();
    if (detected && detected !== timezone) {
      setTimezone(detected);
    }
  }, [automation?.timezone, mode, timezone]);

  const selectedCron = useMemo(() => {
    if (schedule === "daily_at_time") {
      const [hours, minutes] = dailyTime.split(":").map((part) => Number(part));
      if (Number.isInteger(hours) && Number.isInteger(minutes)) {
        return `${minutes} ${hours} * * *`;
      }
      return "0 9 * * *";
    }

    const option = SCHEDULE_OPTIONS.find((entry) => entry.value === schedule);
    if (option) {
      return option.cron;
    }
    return customCron;
  }, [customCron, dailyTime, schedule]);

  const currentPayload = useMemo<FormPayload>(
    () => ({
      name,
      description: description || undefined,
      cronExpr: selectedCron,
      timezone,
      timeoutSeconds: Number(timeoutSeconds),
      enabled,
      code,
      runtime: "nodejs20",
      tags: parsedTags
    }),
    [code, description, enabled, name, parsedTags, selectedCron, timeoutSeconds, timezone]
  );

  const [lastSavedPayload, setLastSavedPayload] = useState<FormPayload>({
    name: automation?.name ?? "",
    description: automation?.description ?? undefined,
    cronExpr: initialCron,
    timezone: automation?.timezone ?? "UTC",
    timeoutSeconds: automation?.timeoutSeconds ?? 30,
    enabled: automation?.enabled ?? true,
    code: automation?.code ?? "console.log(`hello from automation at ${new Date().toISOString()}`);",
    runtime: "nodejs20",
    tags: parseTags((automation?.tags ?? []).join(", "))
  });
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [promptReason, setPromptReason] = useState<PromptReason>("idle");
  const [countdownRemaining, setCountdownRemaining] = useState(AUTOSAVE_COUNTDOWN_SECONDS);
  const [hasAutoSaveAttempted, setHasAutoSaveAttempted] = useState(false);
  const [pendingNavigationIntent, setPendingNavigationIntent] = useState<PendingNavigationIntent>(null);
  const ignoreBeforeUnloadRef = useRef(false);

  const isPending = createAutomation.isPending || updateAutomation.isPending;
  const isDirty = useMemo(
    () => serializePayload(currentPayload) !== serializePayload(lastSavedPayload),
    [currentPayload, lastSavedPayload]
  );

  const restorePayloadToForm = useCallback((payload: FormPayload) => {
    const restoredSchedule = deriveScheduleState(payload.cronExpr);
    setName(payload.name);
    setDescription(payload.description ?? "");
    setSchedule(restoredSchedule.schedule);
    setCustomCron(restoredSchedule.customCron);
    setDailyTime(restoredSchedule.dailyTime);
    setTimezone(payload.timezone);
    setTimeoutSeconds(payload.timeoutSeconds);
    setEnabled(payload.enabled);
    setTags(payload.tags.join(", "));
    setCode(payload.code);
  }, []);

  const continueNavigation = useCallback(
    (intent: PendingNavigationIntent) => {
      if (!intent) {
        return;
      }
      ignoreBeforeUnloadRef.current = true;
      if (intent.type === "back") {
        router.back();
      } else {
        router.push(intent.href);
      }
      window.setTimeout(() => {
        ignoreBeforeUnloadRef.current = false;
      }, 1000);
    },
    [router]
  );

  const performSave = useCallback(
    async (reason: SaveReason) => {
      if (isPending) {
        return false;
      }

      const payload = currentPayload;

      try {
        if (mode === "create") {
          const validated = automationCreateSchema.parse(payload);
          const data = await createAutomation.mutateAsync(validated);
          setLastSavedPayload(payload);

          if (reason === "manual") {
            toast.success("Automation created");
          } else {
            toast.success("Changes auto-saved");
          }

          const navigationToContinue = pendingNavigationIntent;
          setShowUnsavedDialog(false);
          setCountdownRemaining(AUTOSAVE_COUNTDOWN_SECONDS);
          setHasAutoSaveAttempted(false);
          setPendingNavigationIntent(null);

          if (navigationToContinue) {
            continueNavigation(navigationToContinue);
          } else if (reason === "manual") {
            router.push(`/automations/${data.automation.id}`);
          } else {
            router.replace(`/automations/${data.automation.id}`);
          }
          return true;
        }

        const validated = automationUpdateSchema.parse(payload);
        await updateAutomation.mutateAsync(validated);
        setLastSavedPayload(payload);

        if (reason === "manual") {
          toast.success("Automation saved");
        } else {
          toast.success("Changes auto-saved");
        }

        const navigationToContinue = pendingNavigationIntent;
        setShowUnsavedDialog(false);
        setCountdownRemaining(AUTOSAVE_COUNTDOWN_SECONDS);
        setHasAutoSaveAttempted(false);
        setPendingNavigationIntent(null);

        if (navigationToContinue) {
          continueNavigation(navigationToContinue);
        } else if (reason === "manual" && automation?.id) {
          router.push(`/automations/${automation.id}`);
          router.refresh();
        }

        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save automation");
        return false;
      }
    },
    [
      automation?.id,
      continueNavigation,
      createAutomation,
      currentPayload,
      isPending,
      mode,
      pendingNavigationIntent,
      router,
      updateAutomation
    ]
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await performSave("manual");
  };

  const requestLeave = useCallback(
    (intent: PendingNavigationIntent) => {
      if (!isDirty) {
        continueNavigation(intent);
        return;
      }
      setPromptReason("leave");
      setPendingNavigationIntent(intent);
      setCountdownRemaining(AUTOSAVE_COUNTDOWN_SECONDS);
      setHasAutoSaveAttempted(false);
      setShowUnsavedDialog(true);
    },
    [continueNavigation, isDirty]
  );

  useEffect(() => {
    if (!isDirty || showUnsavedDialog || isPending) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPromptReason("idle");
      setPendingNavigationIntent(null);
      setCountdownRemaining(AUTOSAVE_COUNTDOWN_SECONDS);
      setHasAutoSaveAttempted(false);
      setShowUnsavedDialog(true);
    }, IDLE_PROMPT_MS);

    return () => window.clearTimeout(timer);
  }, [currentPayload, isDirty, isPending, showUnsavedDialog]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty || ignoreBeforeUnloadRef.current) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [isDirty]);

  useEffect(() => {
    if (!showUnsavedDialog || isPending) {
      return;
    }
    if (countdownRemaining <= 0 && !hasAutoSaveAttempted) {
      setHasAutoSaveAttempted(true);
      void performSave(promptReason === "leave" ? "leave-autosave" : "idle-autosave");
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdownRemaining((value) => value - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [countdownRemaining, hasAutoSaveAttempted, isPending, performSave, promptReason, showUnsavedDialog]);

  const keepEditing = () => {
    setShowUnsavedDialog(false);
    setPendingNavigationIntent(null);
    setCountdownRemaining(AUTOSAVE_COUNTDOWN_SECONDS);
    setHasAutoSaveAttempted(false);
  };

  const discardChanges = () => {
    const navigationToContinue = pendingNavigationIntent;
    setShowUnsavedDialog(false);
    setPendingNavigationIntent(null);
    setCountdownRemaining(AUTOSAVE_COUNTDOWN_SECONDS);
    setHasAutoSaveAttempted(false);

    if (navigationToContinue) {
      continueNavigation(navigationToContinue);
      return;
    }

    restorePayloadToForm(lastSavedPayload);
  };


  return (
    <>
      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Basic Settings
            </CardTitle>
            <CardDescription>
              Give your automation a name and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="My automation"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  min={1}
                  max={120}
                  value={timeoutSeconds}
                  onChange={(event) => setTimeoutSeconds(Number(event.target.value))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What this automation does"
              />
              <p className="text-xs text-muted-foreground">Short summary shown in your dashboard list.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Schedule
            </CardTitle>
            <CardDescription>
              Configure when your automation should run
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={schedule} onValueChange={setSchedule}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="daily_at_time">Daily at specific time</SelectItem>
                    <SelectItem value="custom">Custom cron</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezoneOptions.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="tag1, tag2"
                />
                <p className="text-xs text-muted-foreground">Comma-separated labels for filtering and organization.</p>
              </div>
            </div>

            {schedule === "daily_at_time" && (
              <div className="space-y-2">
                <Label htmlFor="dailyTime">Daily run time</Label>
                <Input
                  id="dailyTime"
                  type="time"
                  value={dailyTime}
                  onChange={(event) => setDailyTime(event.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Runs every day at this time in <span className="font-medium">{timezone}</span>.
                </p>
              </div>
            )}

            {schedule === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customCron">Custom cron expression</Label>
                <Input
                  id="customCron"
                  value={customCron}
                  onChange={(event) => setCustomCron(event.target.value)}
                  placeholder="e.g. 0 9 * * 1-5"
                  required
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Status
            </CardTitle>
            <CardDescription>
              Enable or disable this automation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Switch
                id="enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
              <Label htmlFor="enabled" className="cursor-pointer">
                {enabled ? "Automation is active" : "Automation is paused"}
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Code
            </CardTitle>
            <CardDescription>
              Write the JavaScript code to execute
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={18}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="font-mono text-xs"
              required
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Runs in Node.js 20 with your encrypted environment variables injected at runtime.
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending} size="lg">
            {isPending ? "Saving..." : mode === "create" ? "Create automation" : "Save changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => requestLeave({ type: "back" })}>
            Cancel
          </Button>
        </div>
      </form>

      <AlertDialog open={showUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes detected</AlertDialogTitle>
            <AlertDialogDescription>
              {promptReason === "leave"
                ? "You are leaving with unsaved updates. We'll auto-save your changes shortly."
                : "You have unsaved edits. We'll auto-save your changes shortly."}
            </AlertDialogDescription>
            <p className="text-sm text-muted-foreground">
              Auto-save in <span className="font-semibold text-foreground">{countdownRemaining}s</span>.
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={keepEditing}>Keep editing</AlertDialogCancel>
            <Button variant="outline" onClick={discardChanges}>
              Discard
            </Button>
            <AlertDialogAction asChild>
              <Button onClick={() => void performSave(promptReason === "leave" ? "leave-autosave" : "idle-autosave")}>
                Save now
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
