import type { InferRequestType, InferResponseType } from "hono/client";
import { hc } from "hono/client";

import type { AppType } from "../.nooh/app";

const client = hc<AppType>("http://localhost:3000");

const getUser = client.users[":id"].$get;

export type GetUserRequest = InferRequestType<typeof getUser>;
export type GetUserResponse = InferResponseType<typeof getUser>;

export const getUserRequest: GetUserRequest = {
  param: {
    id: "1",
  },
};
