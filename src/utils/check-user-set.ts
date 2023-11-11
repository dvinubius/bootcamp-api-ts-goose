import { Request } from 'express';
import { UserDocument } from 'models/User.js';

export const checkLoggedUser = (req: Request): UserDocument => {
  if (!req.user) {
    throw new Error(
      'Internal: Expected user not set on request by auth middleware. Check the route configuration'
    );
  }
  return req.user;
};
