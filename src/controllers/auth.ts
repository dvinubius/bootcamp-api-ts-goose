import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';

import User, { IUser, UserDocument } from '../models/User.js';
import { ErrorResponse } from '../utils/error-response.js';
import { asyncHandler } from '../middleware/async.js';
import sendEmail from '../utils/send-email.js';
import { ResponseCT } from '../types/response-custom-type.type.js';
import { checkLoggedUser } from '../utils/check-user-set.js';
import { setBootcampsJoined } from './utils.js';

// @desc  Register a user
// @route POST /api/v1/auth/register
// @access Public
export const register = asyncHandler(
  async (
    req: Request<{}, {}, IUser>,
    res: ResponseCT<{ token: string }>,
    next: NextFunction
  ) => {
    const { name, email, password, role } = req.body;

    // validation included
    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    sendTokenResponse(user, 200, res);
  }
);

// @desc  Login a user
// @route POST /api/v1/auth/login
// @access Public
export const login = asyncHandler(
  async (
    req: Request<{}, {}, { email: string; password: string }>,
    res: ResponseCT<{ token: string }>,
    next: NextFunction
  ) => {
    const { email, password } = req.body;

    // validate email & password
    if (!email || !password) {
      return next(new ErrorResponse('Please provide email and password', 400));
    }

    // check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    const pwdOk = await user.matchUserEnteredPwd(password);
    if (!pwdOk) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    sendTokenResponse(user, 200, res);
  }
);

// @desc  Get logged in user
// @route GET /api/v1/auth/me
// @access Private
export const getMe = asyncHandler(
  async (
    req: Request,
    res: ResponseCT<{ data: UserDocument }>,
    next: NextFunction
  ) => {
    const loggedUser = checkLoggedUser(req);
    const me = await loggedUser.populate({
      path: 'bootcampsOwned',
      select: 'name description',
    });
    await setBootcampsJoined(me);
    res.status(200).json({
      success: true,
      data: me,
    });
  }
);

// @desc  Logout
// @route GET /api/v1/auth/logout
// @access Private
export const logout = asyncHandler(
  async (req: Request, res: ResponseCT, next: NextFunction) => {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
    res.status(200).json({
      success: true,
    });
  }
);

// @desc  Update user details
// @route PUT /api/v1/auth/updatedetails
// @access Private
export const updateUserDetails = asyncHandler(
  async (
    req: Request<{}, {}, { name: string; email: string }>,
    res: ResponseCT<{ data: UserDocument }>,
    next: NextFunction
  ) => {
    // silently disregarding any fields except name and email
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
    };
    const loggedUser = checkLoggedUser(req);
    const user = await User.findByIdAndUpdate(loggedUser.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({
      success: true,
      data: user!,
    });
  }
);

// @desc  Update user details
// @route PUT /api/v1/auth/updatepassword
// @access Private
export const updatePassword = asyncHandler(
  async (
    req: Request<{}, {}, { currentPassword: string; newPassword: string }>,
    res: ResponseCT<{ token: string }>,
    next: NextFunction
  ) => {
    const loggedUser = checkLoggedUser(req);
    const user = await User.findById(loggedUser.id)
      .select('+password')
      .populate({
        path: 'bootcampsOwned',
        select: 'name description',
      });

    if (!user) {
      throw Error('User not found by the id obtained from auth middleware');
    }

    if (!(await user.matchUserEnteredPwd(req.body.currentPassword))) {
      return next(new ErrorResponse('Password is incorrect', 401));
    }

    user.password = req.body.newPassword;

    await user.save();
    sendTokenResponse(user, 200, res);
  }
);

// @desc  Forgot Password
// @route POST /api/v1/auth/forgotpassword
// @access Public
export const forgotPassword = asyncHandler(
  async (
    req: Request<{}, {}, { email: string }>,
    res: Response,
    next: NextFunction
  ) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return next(new ErrorResponse('There is no user with this email', 400));
    }

    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/auth/resetpassword/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Token',
        message,
      });
      res.status(200).json({ success: true, data: 'Email sent' });
    } catch (err) {
      console.log(err);
      user.resetPasswordToken = undefined;
      user.resetPassowdExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return next(new ErrorResponse('Email could not be sent', 500));
    }
  }
);

// @desc  Reset Password
// @route PUT /api/v1/auth/resetpassword/:resettoken
// @access Public
export const resetPassword = asyncHandler(
  async (
    req: Request<{ resettoken: string }, {}, { password: string }>,
    res: ResponseCT<{ token: string }>,
    next: NextFunction
  ) => {
    // get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');
    const user = await User.findOne({
      resetPasswordToken,
      resetPassowdExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorResponse('Invalid token', 400));
    }

    // set new pwd
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPassowdExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  }
);

export const sendTokenResponse = (
  user: UserDocument,
  statusCode: number,
  res: ResponseCT<{ token: string }>
) => {
  const cookieExpire = process.env.JWT_COOKIE_EXPIRE;
  const token = user.getSignedJwt();
  const options = {
    expires: new Date(
      Date.now() + Number.parseInt(cookieExpire!) * 24 * 3600 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };

  // prettier-ignore
  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token
    })
};
