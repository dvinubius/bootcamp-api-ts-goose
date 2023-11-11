import { Request, Response, NextFunction } from 'express';

import Review, { IReview, ReviewDocument } from './review-model.js';
import { ErrorResponse } from '../utils/error-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import Bootcamp, { BootcampDocument } from '../bootcamp/bootcamp-model.js';
import { ResponseCT } from '../types/response-custom-type.type.js';
import { checkLoggedUser } from '../utils/check-user-set.js';

// @desc  Get all reviews
// @route GET /api/v1/reviews
// @access Public
export const getReviews = asyncHandler(
  async (req: Request, res: ResponseCT, next: NextFunction) => {
    res.status(200).json(res.advancedResults);
  }
);

// @desc  Get all reviews for a bootcamp
// @route GET /api/v1/bootcamps/:id/reviews/
// @access Public
export const getReviewsForBootcamp = asyncHandler(
  async (
    req: Request<{ id: BootcampDocument['id'] }>,
    res: ResponseCT<{ data: ReviewDocument[]; count: number }>,
    next: NextFunction
  ) => {
    const bcId = req.params.id;
    if (!bcId) {
      return next(
        new ErrorResponse(
          'No bootcamp id provided. Please provide a bootcamp id',
          400
        )
      );
    }
    const reviews = await Review.find({ bootcamp: bcId });
    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  }
);

// @desc  Get single review
// @route GET /api/v1/reviews/:id
// @access Public
export const getReview = asyncHandler(
  async (
    req: Request<{ id: ReviewDocument['id'] }>,
    res: ResponseCT<{ data: ReviewDocument }>,
    next
  ) => {
    const review = await Review.findById(req.params.id).populate({
      path: 'bootcamp',
      select: 'name description',
    });
    if (!review) {
      return next(
        new ErrorResponse(`Review not found with id of ${req.params.id}`, 404)
      );
    }
    res.status(200).json({ success: true, data: review });
  }
);

// @desc  Add review to bootcamp
// @route POST /api/v1/bootcamps/:id/reviews
// @access Private
export const addReview = asyncHandler(
  async (
    req: Request<{ id?: BootcampDocument['id'] }, {}, IReview>,
    res: ResponseCT<{ data: ReviewDocument }>,
    next: NextFunction
  ) => {
    const loggedUser = checkLoggedUser(req);
    req.body.bootcamp = req.params.id;
    req.body.author = loggedUser.id;

    const bootcamp = await Bootcamp.findById(req.params.id);

    if (!bootcamp) {
      return next(
        new ErrorResponse(`No bootcamp with id ${req.params.id}`, 404)
      );
    }

    const isParticipant = bootcamp.participants.includes(loggedUser.id);

    if (loggedUser.role !== 'admin' && !isParticipant) {
      return next(
        new ErrorResponse(
          `User ${loggedUser.id} is not authorized to add a review to bootcamp ${bootcamp._id}`,
          401
        )
      );
    }

    const review = await Review.create(req.body);
    res.status(201).json({ success: true, data: review });
  }
);

// @desc  Update review
// @route PUT /api/v1/reviews/:id
// @access Private
export const updateReview = asyncHandler(
  async (
    req: Request<{ id: ReviewDocument['id'] }>,
    res: ResponseCT<{ data: ReviewDocument }>,
    next
  ) => {
    let review = await Review.findById(req.params.id);

    if (!review) {
      return next(new ErrorResponse(`No review with id ${req.params.id}`, 404));
    }

    const loggedUser = checkLoggedUser(req);
    if (loggedUser.role !== 'admin' && loggedUser.id !== review.author) {
      return next(
        new ErrorResponse(
          `User ${loggedUser.id} is not authorized to update review ${review._id}`,
          401
        )
      );
    }

    review = await Review.findOneAndUpdate({ _id: req.params.id }, req.body, {
      validators: true,
      new: true,
    });
    res.status(200).json({ success: true, data: review! });
  }
);

// @desc  Delete review
// @route DELETE /api/v1/reviews/:id
// @access Private
export const deleteReview = asyncHandler(
  async (req: Request<{ id: ReviewDocument['id'] }>, res: Response, next) => {
    let review = await Review.findById(req.params.id);

    if (!review) {
      return next(new ErrorResponse(`No review with id ${req.params.id}`, 404));
    }

    const loggedUser = checkLoggedUser(req);
    if (loggedUser.role !== 'admin' && loggedUser.id !== review.author) {
      return next(
        new ErrorResponse(
          `User ${loggedUser.id} is not authorized to delete review ${review._id}`,
          401
        )
      );
    }

    await review.deleteOne();
    res.status(204).send();
  }
);
