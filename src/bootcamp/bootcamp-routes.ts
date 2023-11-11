import express from 'express';

import {
  getBootcamps,
  getBootcamp,
  createBootcamp,
  updateBootcamp,
  deleteBootcamp,
  getBootcampsInRadius,
  bootcampPhotoUpload,
  registerForBootcamp,
} from './bootcamp-controller.js';
import Course from '../course/course-model.js';
import Review from '../review/review-model.js';
import Bootcamp from './bootcamp-model.js';
import advancedResults from '../middleware/advancedResults.js';
import { protect, authorize } from '../auth/auth-middleware.js';
import {
  addCourse,
  getCoursesForBootcamp,
} from '../course/course-controller.js';
import {
  addReview,
  getReviewsForBootcamp,
} from '../review/review-controller.js';

const router = express.Router();

router.route('/radius/:zipcode/:distance').get(getBootcampsInRadius);

// prettier-ignore
router.route('/')
  .get(advancedResults(
    Bootcamp,
    [{ path: 'courses', select: 'title weeks tuition' },
    { path: 'participants', select: 'name email' }]
  ), getBootcamps)
  .post(protect, authorize('publisher', 'admin'), createBootcamp);

// prettier-ignore
router.route('/:id')
  .get(getBootcamp)
  .put(protect, authorize('publisher', 'admin'), updateBootcamp)
  .delete(protect, authorize('publisher', 'admin'), deleteBootcamp);

// prettier-ignore
router.route('/:id/courses')
    .get(advancedResults(Course, [{path: 'bootcamp', select: 'name description'}]), getCoursesForBootcamp)
    .post(protect, authorize('publisher', 'admin'), addCourse);

router
  .route('/:id/reviews')
  .get(
    advancedResults(Review, [{ path: 'bootcamp', select: 'name description' }]),
    getReviewsForBootcamp
  )
  .post(protect, authorize('user', 'admin'), addReview);

router
  .route('/:id/register')
  .post(protect, authorize('admin'), registerForBootcamp);

router
  .route('/:id/photo')
  .put(protect, authorize('publisher', 'admin'), bootcampPhotoUpload);

export default router;
