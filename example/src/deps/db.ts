import { container } from "@nooh-ts/nooh";

export const db = container({
  posts: () => [
    { id: "1", title: "Post 1" },
    { id: "2", title: "Post 2" },
  ],
});
