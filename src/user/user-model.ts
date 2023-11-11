import crypto from 'crypto';
import { DeleteResult } from 'mongodb';
import mongoose, { Query } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import Bootcamp, { IBootcamp } from '../bootcamp/bootcamp-model.js';
import { DEFAULT_ROLE, ROLES, Role } from './types/role.enum.type.js';

const UserSchema = new mongoose.Schema<UserDocument, UserModel>(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
      required: [true, 'Please add an email'],
      unique: true,
    },
    role: {
      type: String,
      enum: ROLES,
      default: DEFAULT_ROLE,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    resetPasswordToken: String,
    resetPassowdExpire: Date,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export interface IUser {
  // according to schema
  name: string;
  email: string;
  role: Role;
  password: string;
  resetPasswordToken?: string;
  resetPassowdExpire?: Date;
}

export interface UserDocument extends IUser, mongoose.Document {
  bootcampsOwned: mongoose.Types.DocumentArray<IBootcamp>;
  bootcampsJoined: IBootcamp[];
  getResetPasswordToken(): string;
  getSignedJwt(): string;
  matchUserEnteredPwd(userEnteredPwd: string): Promise<boolean>;
}

export interface UserModel extends mongoose.Model<UserDocument> {}

const jwtSecret = process.env.JWT_SECRET;

UserSchema.methods.getSignedJwt = function () {
  return jwt.sign({ id: this._id }, jwtSecret!, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

UserSchema.methods.matchUserEnteredPwd = async function (
  userEnteredPwd: string
) {
  return await bcrypt.compare(userEnteredPwd, this.password);
};

UserSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPassowdExpire = new Date(Date.now() + 10 * 60 * 1000);
  return resetToken;
};

const checkUpdateUserPwd = async function (
  this: UserDocument,
  next: mongoose.CallbackWithoutResultAndOptionalError
) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
};

UserSchema.pre<UserDocument>('save', checkUpdateUserPwd);

// cascade delete bootcamps when owner is deleted
UserSchema.pre<
  Query<DeleteResult, UserDocument, {}, UserDocument, 'deleteOne'>
>('deleteOne', async function (next) {
  // "this" refers to query in case of 'deleteOne', as of Mongoose 8.0
  const docToDelete = await this.model.findOne(this.getQuery());
  await Bootcamp.deleteMany({ owner: docToDelete._id });
  next();
});

// Reverse populate with virtual
UserSchema.virtual('bootcampsOwned', {
  ref: 'Bootcamp',
  localField: '_id',
  foreignField: 'owner',
  justOne: false,
});

const model = mongoose.model<UserDocument, UserModel>('User', UserSchema);

export default model;
