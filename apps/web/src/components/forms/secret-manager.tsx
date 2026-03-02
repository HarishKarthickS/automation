"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { SecretDTO } from "@automation/shared";
import { secretUpsertSchema } from "@automation/shared";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Trash2, Key, MoreVertical, Lock, Copy } from "lucide-react";
import { toast } from "sonner";

interface SecretManagerProps {
  automationId: string;
}

export function SecretManager({ automationId }: SecretManagerProps) {
  const [secrets, setSecrets] = useState<SecretDTO[]>([]);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const loadSecrets = async () => {
    setLoading(true);
    try {
      const response = await apiFetch<{ items: SecretDTO[] }>(`/automations/${automationId}/secrets`, {
        skipCsrf: true
      });
      setSecrets(response.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load secrets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecrets();
  }, [automationId]);

  const saveSecret = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const payload = secretUpsertSchema.parse({ key, value });
      await apiFetch(`/automations/${automationId}/secrets`, {
        method: "POST",
        body: payload
      });
      setKey("");
      setValue("");
      setOpen(false);
      await loadSecrets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save secret");
    }
  };

  const removeSecret = async (secretKey: string) => {
    try {
      await apiFetch(`/automations/${automationId}/secrets/${secretKey}`, {
        method: "DELETE"
      });
      await loadSecrets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete secret");
    }
  };

  const copyKey = async (secretKey: string) => {
    try {
      await navigator.clipboard.writeText(secretKey);
      toast.success("Key copied");
    } catch {
      toast.error("Failed to copy key");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Environment Variables</CardTitle>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Variable
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={saveSecret}>
                <DialogHeader>
                  <DialogTitle>Add Environment Variable</DialogTitle>
                  <DialogDescription>
                    Values are encrypted server-side and never returned after creation.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="key">Key</Label>
                    <Input
                      id="key"
                      value={key}
                      onChange={(event) => setKey(event.target.value.toUpperCase())}
                      placeholder="API_KEY"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="value">Value</Label>
                    <Input
                      id="value"
                      type="password"
                      placeholder="secret value"
                      value={value}
                      onChange={(event) => setValue(event.target.value)}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Secure environment variables available to your automation code
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading secrets...</p>
        ) : secrets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Key className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No environment variables set yet.</p>
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="mt-2">
              <Plus className="mr-2 h-4 w-4" />
              Add your first variable
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {secrets.map((secret) => (
              <div
                key={secret.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm font-medium">{secret.key}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyKey(secret.key)}
                    aria-label={`Copy ${secret.key}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => removeSecret(secret.key)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
