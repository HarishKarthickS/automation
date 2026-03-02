"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  const dailyMatch = initialCron.match(/^(\d{1,2}) (\d{1,2}) \* \* \*$/);
  const initialDailyTime =
    dailyMatch && !SCHEDULE_OPTIONS.some((option) => option.cron === initialCron)
      ? `${dailyMatch[2]!.padStart(2, "0")}:${dailyMatch[1]!.padStart(2, "0")}`
      : "09:00";
  const initialSchedule =
    SCHEDULE_OPTIONS.find((option) => option.cron === initialCron)?.value ??
    (dailyMatch ? "daily_at_time" : "custom");

  const [name, setName] = useState(automation?.name ?? "");
  const [description, setDescription] = useState(automation?.description ?? "");
  const [schedule, setSchedule] = useState<string>(initialSchedule);
  const [customCron, setCustomCron] = useState(
    initialSchedule === "custom" ? initialCron : "*/5 * * * *"
  );
  const [dailyTime, setDailyTime] = useState(initialDailyTime);
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
    () =>
      tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
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

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      name,
      description: description || undefined,
      cronExpr: selectedCron,
      timezone,
      timeoutSeconds: Number(timeoutSeconds),
      enabled,
      code,
      runtime: "nodejs20" as const,
      tags: parsedTags
    };

    if (mode === "create") {
      const validated = automationCreateSchema.parse(payload);
      createAutomation.mutate(validated, {
        onSuccess: (data) => {
          toast.success("Automation created");
          router.push(`/automations/${data.automation.id}`);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to create automation");
        }
      });
      return;
    }

    const validated = automationUpdateSchema.parse(payload);
    updateAutomation.mutate(validated, {
      onSuccess: () => {
        toast.success("Automation saved");
        router.push(`/automations/${automation!.id}`);
        router.refresh();
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to update automation");
      }
    });
  };

  const isPending = createAutomation.isPending || updateAutomation.isPending;

  return (
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
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
