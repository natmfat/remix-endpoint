import { type ZodSchema, type ZodTypeDef } from "zod";
import { ANY_REQUEST_METHOD } from "../types";

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

export type EndpointHandler<
  Headers,
  Params,
  Query,
  Body,
  FormData,
  Context,
  RemixFunction,
> = (args: {
  headers: Headers;
  params: Params;
  query: Query;
  body: Body;
  formData: FormData;
  context: Context;
}) => RemixFunction;

export type RemixEndpointArgs = {
  logError: (error: unknown) => void;
};

export class RemixEndpoint<T> {
  public endpoints: Record<string, T> = {};
  public logError: RemixEndpointArgs["logError"];

  constructor({ logError = () => {} }: Partial<RemixEndpointArgs> = {}) {
    this.logError = logError;
  }
}
