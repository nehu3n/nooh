export class UserNotFound extends Error {
  readonly userId: string;

  constructor(userId: string) {
    super(`User ${userId} not found`);
    this.userId = userId;
  }
}

export class UnauthorizedAccess extends Error {
  constructor() {
    super("Unauthorized access");
  }
}
