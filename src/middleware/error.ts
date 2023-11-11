import { NextFunction, Request, Response } from 'express';
import { MongoError } from 'mongodb';
import mongoose from 'mongoose';
import { ErrorResponse } from '../utils/error-response.js';

const errorHandler = (
  err: Error,
  req: Request,
  res: Response<Omit<ErrorResponse, 'statusCode'>>,
  next: NextFunction
) => {
  // if it's not our custom error, attempt to narrow it down
  const errorRes = err instanceof ErrorResponse ? err : narrowDownError(err);

  const statusCode = errorRes.statusCode;
  const resp = {
    ...errorRes,
    statusCode: undefined,
  };
  res.status(statusCode).json(resp);
};

const narrowDownError = (err: Error) => {
  let errorRes = new ErrorResponse(err.message || 'Server Error', 500);

  // for dev
  console.log(err.stack?.red);
  if (err instanceof mongoose.Error.CastError) {
    const message = `Resource not found`;
    errorRes = new ErrorResponse(message, 404);
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const message = Object.values(err.errors)
      .map((v) => v.message)
      .join('\n');
    errorRes = new ErrorResponse(message, 400);
  }
  // mongoose duplicate key
  if ((err as MongoError).code === 11000) {
    const message = 'Duplicate field value entered';
    errorRes = new ErrorResponse(message, 400);
  }
  return errorRes;
};

export default errorHandler;
