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
import type * as analytics from "../analytics.js";
import type * as customerDashboard from "../customerDashboard.js";
import type * as customerOrders from "../customerOrders.js";
import type * as forwarderSettings from "../forwarderSettings.js";
import type * as forwarderShipping from "../forwarderShipping.js";
import type * as forwarders from "../forwarders.js";
import type * as http from "../http.js";
import type * as migrate from "../migrate.js";
import type * as orders from "../orders.js";
import type * as seedTestData from "../seedTestData.js";
import type * as subscriptions from "../subscriptions.js";
import type * as users from "../users.js";
import type * as utils_locationTimezone from "../utils/locationTimezone.js";
import type * as utils_timezone from "../utils/timezone.js";
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
  analytics: typeof analytics;
  customerDashboard: typeof customerDashboard;
  customerOrders: typeof customerOrders;
  forwarderSettings: typeof forwarderSettings;
  forwarderShipping: typeof forwarderShipping;
  forwarders: typeof forwarders;
  http: typeof http;
  migrate: typeof migrate;
  orders: typeof orders;
  seedTestData: typeof seedTestData;
  subscriptions: typeof subscriptions;
  users: typeof users;
  "utils/locationTimezone": typeof utils_locationTimezone;
  "utils/timezone": typeof utils_timezone;
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
