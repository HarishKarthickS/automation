import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10)
});

export const signupSchema = loginSchema.extend({
  name: z.string().min(2).max(120)
});

