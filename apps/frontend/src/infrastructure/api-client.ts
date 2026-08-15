import { ApiErrorSchema } from "@streamkit/contracts";

import { getBackendConnection } from "./desktop-bridge";

export class StreamKitApiError extends Error {
  public constructor(
    message: string,
    public readonly code: string,
    public readonly requestId?: string,
    public readonly status?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "StreamKitApiError";
  }
}

type ResponseSchema<T> = { parse(input: unknown): T };

type RequestOptions<T> = {
  body?: unknown;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  schema?: ResponseSchema<T>;
};

export class ApiClient {
  public async request<T = void>(path: string, options: RequestOptions<T> = {}): Promise<T> {
    const connection = await getBackendConnection();
    const request: RequestInit = {
      method: options.method ?? "GET",
      headers: {
        authorization: `Bearer ${connection.token}`,
        ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    };
    const response = await fetch(`${connection.baseUrl}${path}`, request);

    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => undefined);
      const parsed = ApiErrorSchema.safeParse(payload);
      if (parsed.success) {
        throw new StreamKitApiError(
          formatApiError(
            parsed.data.error.code,
            parsed.data.error.message,
            response.status,
            parsed.data.error.details,
            parsed.data.error.requestId,
          ),
          parsed.data.error.code,
          parsed.data.error.requestId,
          response.status,
          parsed.data.error.details,
        );
      }
      throw new StreamKitApiError(`The API returned status ${response.status}.`, "HTTP_ERROR");
    }

    if (response.status === 204 || !options.schema) return undefined as T;
    return options.schema.parse(await response.json());
  }
}

export const apiClient = new ApiClient();

function formatApiError(
  code: string,
  message: string,
  status: number,
  details: unknown,
  requestId: string,
): string {
  const detailText = details == null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  return `[${code}] ${message} (HTTP ${status})\nRequest ID: ${requestId}${detailText}`;
}
