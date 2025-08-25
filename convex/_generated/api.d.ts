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
import type * as cleanupUser from "../cleanupUser.js";
import type * as courierIntegrations from "../courierIntegrations.js";
import type * as customerDashboard from "../customerDashboard.js";
import type * as customerOrders from "../customerOrders.js";
import type * as emails from "../emails.js";
import type * as files from "../files.js";
import type * as fixUserRole from "../fixUserRole.js";
import type * as fixUsers from "../fixUsers.js";
import type * as forwarderSettings from "../forwarderSettings.js";
import type * as forwarderShipping from "../forwarderShipping.js";
import type * as forwarders from "../forwarders.js";
import type * as http from "../http.js";
import type * as linkExistingEmail from "../linkExistingEmail.js";
import type * as migrate from "../migrate.js";
import type * as orderStatusHistory from "../orderStatusHistory.js";
import type * as orders from "../orders.js";
import type * as parcelConditions from "../parcelConditions.js";
import type * as seedTestData from "../seedTestData.js";
import type * as staff from "../staff.js";
import type * as stripe from "../stripe.js";
import type * as subscriptions from "../subscriptions.js";
import type * as users from "../users.js";
import type * as utils_locationTimezone from "../utils/locationTimezone.js";
import type * as utils_timezone from "../utils/timezone.js";
import type * as warehouseRates from "../warehouseRates.js";
import type * as warehouseServiceAreas from "../warehouseServiceAreas.js";
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
  cleanupUser: typeof cleanupUser;
  courierIntegrations: typeof courierIntegrations;
  customerDashboard: typeof customerDashboard;
  customerOrders: typeof customerOrders;
  emails: typeof emails;
  files: typeof files;
  fixUserRole: typeof fixUserRole;
  fixUsers: typeof fixUsers;
  forwarderSettings: typeof forwarderSettings;
  forwarderShipping: typeof forwarderShipping;
  forwarders: typeof forwarders;
  http: typeof http;
  linkExistingEmail: typeof linkExistingEmail;
  migrate: typeof migrate;
  orderStatusHistory: typeof orderStatusHistory;
  orders: typeof orders;
  parcelConditions: typeof parcelConditions;
  seedTestData: typeof seedTestData;
  staff: typeof staff;
  stripe: typeof stripe;
  subscriptions: typeof subscriptions;
  users: typeof users;
  "utils/locationTimezone": typeof utils_locationTimezone;
  "utils/timezone": typeof utils_timezone;
  warehouseRates: typeof warehouseRates;
  warehouseServiceAreas: typeof warehouseServiceAreas;
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
