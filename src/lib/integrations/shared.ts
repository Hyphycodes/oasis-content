import "server-only";

export class IntegrationResponseError extends Error {
  constructor(public provider: string, public status: number, public code: string, message: string) {
    super(message);
    this.name = "IntegrationResponseError";
  }
}

export async function parseIntegrationResponse<T>(provider: string, response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message ?? body?.message ?? `${provider} request failed`;
    const code = String(body?.error?.code ?? body?.error?.status ?? response.status);
    throw new IntegrationResponseError(provider, response.status, code, message);
  }
  return body as T;
}
