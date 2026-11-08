import auth from "./auth";
import common from "./common";
import consoleMessages from "./console";
import landing from "./landing";
import partners from "./partners";
import pot from "./pot";
import recommend from "./recommend";
import store from "./store";

/**
 * Registry of all namespaces. Each feature owns exactly one namespace file;
 * add keys there, not here.
 */
export const catalog = {
  common,
  auth,
  landing,
  store,
  recommend,
  pot,
  console: consoleMessages,
  partners,
};

export type Namespace = keyof typeof catalog;
export type MessageKey<N extends Namespace> = keyof (typeof catalog)[N]["en"] & string;
