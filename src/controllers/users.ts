import User, { IUser, UserDocument } from '../models/User.js';
import { ErrorResponse } from '../utils/error-response.js';
import { asyncHandler } from '../middleware/async.js';
import { Request, Response, NextFunction } from 'express';
import { ResponseCT } from 'types/response-custom-type.type.js';
import { setBootcampsJoined } from './utils.js';

// @desc  Get all users
// @route GET /api/v1/users
// @access Private/Admin
export const getUsers = asyncHandler(
  async (req: Request, res: ResponseCT, next: NextFunction) => {
    res.status(200).json(res.advancedResults);
  }
);

// @desc  Get a single user
// @route GET /api/v1/users/:id
// @access Private/Admin
export const getUser = asyncHandler(
  async (
    req: Request<{ id: UserDocument['id'] }>,
    res: ResponseCT<{ data: UserDocument }>,
    next: NextFunction
  ) => {
    const user = await User.findById(req.params.id).populate({
      path: 'bootcampsOwned',
      select: 'name description',
    });
    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    await setBootcampsJoined(user);

    res.status(200).json({
      success: true,
      data: user,
    });
  }
);

// @desc  Create a user
// @route POST /api/v1/users/
// @access Private/Admin
export const createUser = asyncHandler(
  async (
    req: Request<{}, {}, IUser>,
    res: ResponseCT<{ data: UserDocument }>,
    next: NextFunction
  ) => {
    const user = await User.create(req.body);
    res.status(201).json({
      success: true,
      data: user,
    });
  }
);

// @desc  Update a user
// @route PUT /api/v1/users/:id
// @access Private/Admin
export const updateUser = asyncHandler(
  async (
    req: Request<{ id: UserDocument['id'] }>,
    res: ResponseCT<{ data: UserDocument }>,
    next: NextFunction
  ) => {
    let user = await User.findById(req.params.id);
    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    await User.updateOne({ _id: req.params.id }, req.body, {
      runValidators: true,
    });
    user = await User.findById(req.params.id);
    res.status(200).json({ success: true, data: user! });
  }
);

// @desc Delete a user
// @route DELETE /api/v1/users/:id
// @access Private/Admin
export const deleteUser = asyncHandler(
  async (
    req: Request<{ id: UserDocument['id'] }>,
    res: Response,
    next: NextFunction
  ) => {
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }
    await User.deleteOne({ _id: req.params.id });
    res.status(204).send();
  }
);
