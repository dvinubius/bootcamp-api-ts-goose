import express from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/users.js';
// Include other resource routers
import User from '../models/User.js';
import advancedResults from '../middleware/advancedResults.js';
import { protect, authorize } from '../middleware/auth.js';

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
