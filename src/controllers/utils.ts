import { UserDocument } from 'models/User.js';
import Bootcamp from '../models/Bootcamp.js';

export const setBootcampsJoined = async (user: UserDocument) => {
  const bootcamps = await Bootcamp.find({
    participants: user.id,
  })
    .select('name')
    .exec();
  user.bootcampsJoined = bootcamps;
};
