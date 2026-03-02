async function authRequest(path: string, body?: unknown) {
  const response = await fetch(`/api/v1/auth/${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message ?? "Authentication request failed");
  }

  return response;
}

export const authClient = {
  async signInEmail(input: { email: string; password: string }) {
    return authRequest("sign-in/email", input);
  },
  async signUpEmail(input: { email: string; password: string; name: string }) {
    return authRequest("sign-up/email", input);
  },
  async signOut() {
    return authRequest("sign-out");
  }
};
