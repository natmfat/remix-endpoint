import { type ZodTypeAny } from "zod";
import { EndpointParameter } from "./endpoints/RemixEndpoint";

export async function validate(
  requestParameter: EndpointParameter,
  schema: ZodTypeAny | undefined,
  data: unknown,
) {
  if (!schema) {
    return {};
  }

  const parsed = await schema.safeParseAsync(data);
  if (!parsed.success) {
    throw new Error(`Failed to validate ${requestParameter}`);
  }

  return parsed.data;
}

/**
 * Ensure that a value exists; otherwise throw a 500 error
 * @param value
 */
export function assertResponse(
  value: unknown,
  response: Response | string = "Missing required value.",
): asserts value {
  if (!value) {
    // throw server error if provided
    if (response && typeof response === "string") {
      throw standardResponse(false, response);
    }

    throw response;
  }
}

/**
 * Return a standardResponse response \
 * Use if you are not simply returning data (ie: error messages, status messages)
 * @param success If the operation succeeded or not
 * @param message Message to include (defaults to a generic message depending on the value of success, you should write something better)
 * @param data Optional data payload (untyped, use sparingly for debugging purposes)
 * @returns Simple standardResponse response object with JSON payload
 */
export async function standardResponse<
  T extends Record<string, unknown> = Record<string, unknown>,
>(success: boolean, messageOverride?: string, data?: T) {
  const message =
    messageOverride ||
    (success ? "This operation succeeded" : "This operation failed");

  return new Response(
    JSON.stringify({
      success,
      message: message,
      data: data || null,
    } satisfies StandardResponse),
    {
      status: success ? 200 : 500,
      statusText: message,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

export type StandardResponse<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  success: boolean;
  message: string;
  data: T | null;
};
