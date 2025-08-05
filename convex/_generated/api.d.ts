/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as forwarders from "../forwarders.js";
import type * as http from "../http.js";
import type * as orders from "../orders.js";
import type * as subscriptions from "../subscriptions.js";
import type * as users from "../users.js";
import type * as warehouses from "../warehouses.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  forwarders: typeof forwarders;
  http: typeof http;
  orders: typeof orders;
  subscriptions: typeof subscriptions;
  users: typeof users;
  warehouses: typeof warehouses;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
