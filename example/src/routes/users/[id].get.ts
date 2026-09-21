import db from "@deps/db";
import { get } from "@router/users/[id]";

export default get({
  deps: [db.posts],

  handler: ({ c, posts }) => {
    const id = c.req.param("id");

    return c.json({
      id,
      posts,
    });
  },
});
