import { Request, Response, NextFunction } from 'express';

import Course, { CourseDocument, ICourse } from './course-model.js';
import { ErrorResponse } from '../utils/error-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import Bootcamp, { BootcampDocument } from '../bootcamp/bootcamp-model.js';
import { ResponseCT } from '../types/response-custom-type.type.js';
import { checkLoggedUser } from '../utils/check-user-set.js';

// @desc  Get all courses
// @route GET /api/v1/courses
// @access Public
export const getCourses = asyncHandler(
  async (req: Request, res: ResponseCT, next: NextFunction) => {
    res.status(200).json(res.advancedResults);
  }
);

// @desc  Get all courses for a bootcamp
// @route GET /api/v1/bootcamp/:id/courses
// @access Public
export const getCoursesForBootcamp = asyncHandler(
  async (
    req: Request<{ id: BootcampDocument['id'] }>,
    res: ResponseCT<{ data: CourseDocument[]; count: number }>,
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

    const courses = await Course.find({ bootcamp: bcId });
    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  }
);

// @desc  Get single course
// @route GET /api/v1/courses/:id
// @access Public
export const getCourse = asyncHandler(
  async (
    req: Request<{ id: CourseDocument['id'] }>,
    res: ResponseCT<{ data: CourseDocument }>,
    next: NextFunction
  ) => {
    const course = await Course.findById(req.params.id).populate({
      path: 'bootcamp',
      select: 'name description',
    });
    if (!course) {
      return next(
        new ErrorResponse(`Course not found with id of ${req.params.id}`, 404)
      );
    }
    res.status(200).json({ success: true, data: course });
  }
);

// @desc  Add course to bootcamp
// @route POST /api/v1/bootcamps/:id/courses
// @access Private
export const addCourse = asyncHandler(
  async (
    req: Request<
      { id?: BootcampDocument['id'] },
      { data: CourseDocument },
      ICourse
    >,
    res: ResponseCT<{ data: CourseDocument }>,
    next: NextFunction
  ) => {
    const loggedUser = checkLoggedUser(req);

    req.body.bootcamp = req.params.id;
    req.body.owner = loggedUser.id;

    const bootcamp = await Bootcamp.findById(req.params.id);

    if (!bootcamp) {
      return next(
        new ErrorResponse(`No bootcamp with id ${req.params.id}`, 404)
      );
    }

    if (
      loggedUser.role !== 'admin' &&
      bootcamp.owner.toString() !== loggedUser.id
    ) {
      return next(
        new ErrorResponse(
          `User ${loggedUser.id} is not authorized to add a course to bootcamp ${bootcamp._id}`,
          401
        )
      );
    }

    const course = await Course.create(req.body);

    res.status(201).json({ success: true, data: course });
  }
);

// @desc  Update course
// @route PUT /api/v1/courses/:id
// @access Private
export const updateCourse = asyncHandler(
  async (
    req: Request<{ id: CourseDocument['id'] }>,
    res: ResponseCT<{ data: CourseDocument }>,
    next: NextFunction
  ) => {
    let course = await Course.findById(req.params.id);

    if (!course) {
      return next(new ErrorResponse(`No course with id ${req.params.id}`, 404));
    }

    const loggedUser = checkLoggedUser(req);
    if (
      loggedUser.role !== 'admin' &&
      course.owner.toString() !== loggedUser.id
    ) {
      return next(
        new ErrorResponse(
          `User ${loggedUser.id} is not authorized to update course ${course._id}`,
          401
        )
      );
    }

    course = await Course.findOneAndUpdate({ _id: req.params.id }, req.body, {
      validators: true,
      new: true,
    });
    res.status(200).json({ success: true, data: course! });
  }
);

// @desc  Delete course
// @route DELTE /api/v1/courses/:id
// @access Private
export const deleteCourse = asyncHandler(
  async (
    req: Request<{ id: CourseDocument['id'] }>,
    res: Response,
    next: NextFunction
  ) => {
    let course = await Course.findById(req.params.id);

    if (!course) {
      return next(new ErrorResponse(`No course with id ${req.params.id}`, 404));
    }

    const loggedUser = checkLoggedUser(req);
    if (
      loggedUser.role !== 'admin' &&
      course.owner.toString() !== loggedUser.id
    ) {
      return next(
        new ErrorResponse(
          `User ${loggedUser.id} is not authorized to delete course ${course._id}`,
          401
        )
      );
    }

    await course.deleteOne();
    res.status(204).send();
  }
);
