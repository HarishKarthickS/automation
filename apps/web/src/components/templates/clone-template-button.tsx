"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";

interface CloneTemplateButtonProps {
  templateId: string;
  templateName: string;
}

export function CloneTemplateButton({ templateId, templateName }: CloneTemplateButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(`${templateName} (Copy)`);

  const handleClone = async () => {
    if (!name.trim()) return;

    const timezoneOverride =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    setBusy(true);
    try {
      const response = await apiFetch<{ automationId: string }>(`/templates/${templateId}/clone`, {
        method: "POST",
        body: { nameOverride: name, timezoneOverride }
      });
      toast.success("Template cloned successfully!");
      setOpen(false);
      router.push(`/automations/${response.automationId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clone template");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Copy className="mr-2 h-4 w-4" />
          Use template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clone Template</DialogTitle>
          <DialogDescription>
            Create a new automation based on this template.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Automation name</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="My automation"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleClone} disabled={busy || !name.trim()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Clone template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
