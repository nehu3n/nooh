import db from "@deps/db";
import { UnauthorizedAccess, UserNotFound } from "@errors/user";

import { get } from "@router/users/[id]";

export default get({
  deps: [db.posts],

  errors: {
    notFound: UserNotFound,
    unauthorized: UnauthorizedAccess,
  },

  handler: ({ c, posts, errors }) => {
    const id = c.req.param("id");

    if (id === "401") {
      throw errors.unauthorized();
    }

    if (id === "404") {
      throw errors.notFound(id);
    }

    return c.json({
      id,
      posts,
    });
  },
});
