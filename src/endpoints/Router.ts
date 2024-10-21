import { type ZodSchema, type ZodTypeAny, type ZodTypeDef } from "zod";

export const INTENT = "intent" as const;

export const DEFAULT_INTENT = "default" as const;

export const ANY_REQUEST_METHOD = "ANY" as const;

export type EndpointParameter =
  | "headers"
  | "params"
  | "query"
  | "body"
  | "formData";

export type EndpointMethod =
  | "DELETE"
  | "PATCH"
  | "POST"
  | "PUT"
  | "GET"
  | typeof ANY_REQUEST_METHOD;

/* eslint-disable @typescript-eslint/no-explicit-any */
export type EndpointValidation<Headers, Params, Query, Body, FormData> = {
  headers?: ZodSchema<Headers, ZodTypeDef, any>;
  params?: ZodSchema<Params, ZodTypeDef, any>;
  query?: ZodSchema<Query, ZodTypeDef, any>;
  body?: ZodSchema<Body, ZodTypeDef, any>;
  formData?: ZodSchema<FormData, ZodTypeDef, any>;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export type StandardResponse<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  /** Was the operation successful? */
  success: boolean;
  /** Success or failure message */
  message: string;
  /** Optional data to pass to the client */
  data: T | null;
};

export type RouterArgs = {
  logError: (error: unknown) => void;
};

// not really a router, not sure why I'm calling it that
// not consumed by the client so should be fine
export class Router<T> {
  public endpoints: Record<string, T> = {};
  public logError: RouterArgs["logError"];

  constructor({ logError = () => {} }: Partial<RouterArgs> = {}) {
    this.logError = logError;
  }

  static async validate(
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
  static assertResponse(
    value: unknown,
    response: Response | string = "Missing required value.",
  ): asserts value {
    if (!value) {
      // throw server error if provided
      if (response && typeof response === "string") {
        throw Router.standardResponse(false, response);
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
  static async standardResponse<
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
}
