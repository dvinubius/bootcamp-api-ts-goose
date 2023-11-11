import { UserDocument } from 'user/user-model.js';
import Bootcamp from '../bootcamp/bootcamp-model.js';

export const setBootcampsJoined = async (user: UserDocument) => {
  const bootcamps = await Bootcamp.find({
    participants: user.id,
  })
    .select('name')
    .exec();
  user.bootcampsJoined = bootcamps;
};
