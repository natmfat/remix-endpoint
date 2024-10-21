import { ActionFunction, ActionFunctionArgs } from "@remix-run/node";

import {
  ANY_REQUEST_METHOD,
  EndpointMethod as BaseEndpointMethod,
  DEFAULT_INTENT,
  EndpointValidation,
  INTENT,
  Router,
} from "./Router";

type EndpointMethod = Exclude<BaseEndpointMethod, "GET">;

type Endpoint<Headers, Params, Query, Body, FormData, Context> = {
  /** Expected request method (GET, POST, etc.) */
  method: EndpointMethod;
  /** Validate request parameters */
  validate: Partial<EndpointValidation<Headers, Params, Query, Body, FormData>>;
  /** Request handler that should return a response; runs after validation */
  handler: EndpointHandler<Headers, Params, Query, Body, FormData, Context>;
};

type EndpointHandler<Headers, Params, Query, Body, FormData, Context> = (args: {
  headers: Headers;
  params: Params;
  query: Query;
  body: Body;
  formData: FormData;
  context: Context;
}) => ReturnType<ActionFunction>;

type RegisterEndpointArgs<H, P, Q, B, F> = {
  intent?: string;
  method?: EndpointMethod;
  validate?: Partial<EndpointValidation<H, P, Q, B, F>>;
  handler: EndpointHandler<H, P, Q, B, F, { request: Request }>;
};

export class RemixAction extends Router<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Endpoint<any, any, any, any, any, any>
> {
  register<H, P, Q, B, F>({
    intent = DEFAULT_INTENT,
    method = ANY_REQUEST_METHOD,
    validate = {},
    handler = () =>
      Router.standardResponse(false, "no handler was defined for this method"),
  }: RegisterEndpointArgs<H, P, Q, B, F>) {
    this.endpoints[intent] = {
      method,
      validate,
      handler,
    };
    return this;
  }

  create() {
    const action = async (args: ActionFunctionArgs) => {
      // get intent from url search params or form data
      const url = new URL(args.request.url);
      let rawFormData: FormData = new FormData();
      let rawBody: Record<string, unknown> = {};
      try {
        if (args.request.headers.get("Content-Type") === "application/json") {
          rawBody = await args.request.json();
        } else {
          rawFormData = await args.request.formData();
        }
      } catch (error) {
        this.logError(error);
        throw Router.standardResponse(
          false,
          "Failed to retrieve request body or form data.",
        );
      }

      // verify intent
      const intent =
        url.searchParams.get(INTENT) ||
        rawFormData.get(INTENT) ||
        rawBody[INTENT] ||
        DEFAULT_INTENT;
      Router.assertResponse(
        intent && typeof intent === "string" && intent in this.endpoints,
        "Intent not provided.",
      );

      // verify intent method
      const endpoint = this.endpoints[intent];
      Router.assertResponse(
        endpoint.method === ANY_REQUEST_METHOD ||
          endpoint.method === args.request.method,
        `Invalid method ${args.request.method} for endpoint with intent ${intent}, expected ${endpoint.method}`,
      );

      // validate everything
      const schema = endpoint.validate || {};
      try {
        const [headers, params, query, body, formData] = await Promise.all([
          Router.validate(
            "headers",
            schema.headers,
            Object.fromEntries(args.request.headers),
          ),
          Router.validate("params", schema.params, args.params),
          Router.validate("query", schema.query, url.searchParams),
          Router.validate("body", schema.body, rawBody),
          Router.validate("formData", schema.formData, rawFormData),
        ]);

        return endpoint.handler({
          headers,
          params,
          query,
          body,
          formData,
          context: { request: args.request },
        });
      } catch (error) {
        this.logError(error);
        throw Router.standardResponse(false, "Failed to execute endpoint.");
      }
    };

    return action;
  }
}
