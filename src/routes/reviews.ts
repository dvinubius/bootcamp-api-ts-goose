import express from 'express';
import Review from '../models/Review.js';
import {
  getReviews,
  getReview,
  addReview,
  updateReview,
  deleteReview,
} from '../controllers/reviews.js';
import advancedResults from '../middleware/advancedResults.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// prettier - ignore
router
  .route('/')
  .get(
    advancedResults(Review, [{ path: 'bootcamp', select: 'name description' }]),
    getReviews
  );

// prettier-ignore
router.route('/:id')
  .get(getReview)
  .put(protect, updateReview)
  .delete(protect, deleteReview)

export default router;
