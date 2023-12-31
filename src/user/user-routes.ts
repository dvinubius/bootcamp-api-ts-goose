import express from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from './user-controller.js';
// Include other resource routers
import User from './user-model.js';
import advancedResults from '../middleware/advancedResults.js';
import { protect, authorize } from '../auth/auth-middleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));
// prettier-ignore
router.route('/')
  .get(advancedResults(User, ['bootcampsOwned']), getUsers)
  .post(createUser)

// prettier-ignore
router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser)

export default router;
