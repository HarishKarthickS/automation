ALTER TABLE "automations"
  DROP CONSTRAINT IF EXISTS automations_runtime_check;

ALTER TABLE "templates"
  DROP CONSTRAINT IF EXISTS templates_runtime_check;

ALTER TABLE "automations"
  ADD CONSTRAINT automations_runtime_check
  CHECK ("runtime" IN ('nodejs20', 'cpp23', 'java21', 'python312', 'go122', 'rust183'));

ALTER TABLE "templates"
  ADD CONSTRAINT templates_runtime_check
  CHECK ("runtime" IN ('nodejs20', 'cpp23', 'java21', 'python312', 'go122', 'rust183'));
