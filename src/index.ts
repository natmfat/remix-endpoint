// heavily inspired by koa-zod-router
// https://github.com/JakeFenley/koa-zod-router/
import {
  ActionFunction,
  ActionFunctionArgs,
  LoaderFunction,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { ZodSchema, ZodTypeAny, z } from "zod";

import { INTENT } from "./constants";
import { assertResponse, standardResponse } from "./utils";

type RequestMethod = "DELETE" | "PATCH" | "POST" | "PUT" | "GET" | "ALL";
type RequestParameter = "headers" | "params" | "query" | "body" | "formData";

/* eslint-disable @typescript-eslint/no-explicit-any */
type ValidationOptions<Headers, Params, Query, Body, FormData> = {
  headers?: ZodSchema<Headers, z.ZodTypeDef, any>;
  params?: ZodSchema<Params, z.ZodTypeDef, any>;
  query?: ZodSchema<Query, z.ZodTypeDef, any>;
  body?: ZodSchema<Body, z.ZodTypeDef, any>;
  formData?: ZodSchema<FormData, z.ZodTypeDef, any>;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

type HandlerFn<Headers, Params, Query, Body, FormData, Context> = (args: {
  headers: Headers;
  body: Body;
  params: Params;
  query: Query;
  formData: FormData;
  context: Context;
}) => ReturnType<ActionFunction> | ReturnType<LoaderFunction>;

type Action<Headers, Params, Query, Body, FormData, Context> = {
  /** Expected request method (GET, POST, etc.) */
  method: RequestMethod;
  /** Validate request parameters */
  validate: Partial<ValidationOptions<Headers, Params, Query, Body, FormData>>;
  /** Request handler that should return a response; runs after validation */
  handler: HandlerFn<Headers, Params, Query, Body, FormData, Context>;
};

type RemixEndpointArgs = {
  logError: (error: unknown) => void;
};

export class RemixEndpoint {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private actions: Record<string, Action<any, any, any, any, any, any>> = {};
  private logError: RemixEndpointArgs["logError"];

  constructor({ logError = () => {} }: Partial<RemixEndpointArgs> = {}) {
    this.logError = logError;
  }

  register<H, P, Q, B, F>({
    intent = "default",
    method = "GET",
    validate = {},
    handler = () =>
      standardResponse(false, "no handler was defined for this method"),
  }: {
    intent?: string;
    method?: RequestMethod;
    validate?: Partial<ValidationOptions<H, P, Q, B, F>>;
    handler: HandlerFn<H, P, Q, B, F, { request: Request }>;
  }) {
    this.actions[intent] = {
      method,
      validate,
      handler,
    };
    return this;
  }

  async validate(
    requestParameter: RequestParameter,
    data: unknown,
    schema: ZodTypeAny | undefined,
  ) {
    if (!schema) {
      return {};
    }

    const parsed = await schema.safeParseAsync(data);
    if (!parsed.success) {
      this.logError(parsed.error);
      throw standardResponse(false, `Failed to parse ${requestParameter}`, {
        error: parsed.error,
      });
    }
    return parsed.data;
  }

  create() {
    const resourceFunction = async (
      args: ActionFunctionArgs | LoaderFunctionArgs,
    ) => {
      // get intent from url search params or form data
      const url = new URL(args.request.url);
      let rawFormData: FormData = new FormData();
      let rawBody: Record<string, unknown> = {};
      if (args.request.method !== "GET") {
        try {
          if (args.request.headers.get("Content-Type") === "application/json") {
            rawBody = await args.request.json();
          } else {
            rawFormData = await args.request.formData();
          }
        } catch (error) {
          this.logError(error);
          throw standardResponse(
            false,
            "Failed to retrieve request body or form data.",
          );
        }
      }

      // verify intent
      const intent =
        url.searchParams.get(INTENT) ||
        rawFormData.get(INTENT) ||
        rawBody[INTENT] ||
        "default";
      assertResponse(
        intent && typeof intent === "string" && intent in this.actions,
        "Intent not provided.",
      );

      // verify intent method
      const action = this.actions[intent];
      assertResponse(
        action.method === "ALL" || action.method === args.request.method,
        "intent found, but does not match action builder request method",
      );

      // validate everything
      const validate = action.validate || {};
      try {
        const [headers, params, query, body, formData] = await Promise.all([
          this.validate(
            "headers",
            Object.fromEntries(args.request.headers),
            validate.headers,
          ),
          this.validate("params", args.params, validate.params),
          this.validate("query", url.searchParams, validate.query),
          this.validate("body", rawBody, validate.body),
          this.validate("formData", rawFormData, validate.formData),
        ]);

        return action.handler({
          headers,
          params,
          query,
          body,
          formData,
          context: { request: args.request },
        });
      } catch (error) {
        this.logError(error);
        throw standardResponse(false, "Failed to execute endpoint.");
      }
    };

    return resourceFunction;
  }
}
