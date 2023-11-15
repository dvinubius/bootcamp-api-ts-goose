import mongoose, { Query } from 'mongoose';
import { UpdateResult } from 'mongodb';

import { MINIMUM_SKILLS } from './types/minimum-skill.enum.type.js';
import Bootcamp, { BootcampBaseDocument } from '../bootcamp/bootcamp-model.js';
import { UserDocument } from '../user/user-model.js';

const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    required: [true, 'Please add a course title'],
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
  },
  weeks: {
    type: String,
    required: [true, 'Please add number of weeks'],
  },
  tuition: {
    type: Number,
    required: [true, 'Please add a tuition cost'],
  },
  minimumSkill: {
    type: String,
    required: [true, 'Please add a minimum skill'],
    enum: MINIMUM_SKILLS,
  },
  scholarshipAvailable: {
    type: Boolean,
    default: false,
  },
  bootcamp: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bootcamp',
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

export interface ICourse {
  title: string;
  description: string;
  weeks: string;
  tuition: number;
  minimumSkill: string;
  scholarshipAvailable: boolean;
  bootcamp: mongoose.Types.ObjectId | Record<string, unknown>;
  owner: mongoose.Types.ObjectId | Record<string, unknown>;
}

export type CreateCourseDto = ICourse;
export type UpdateCourseDto = Partial<ICourse>;

interface CourseBaseDocument extends ICourse, mongoose.Document {
  bootcamp: BootcampBaseDocument['_id'] | BootcampBaseDocument;
  owner: UserDocument['_id'] | UserDocument;
}

export interface CourseDocument extends CourseBaseDocument {
  bootcamp: BootcampBaseDocument['_id'];
  owner: UserDocument['_id'];
}

export interface CoursePopulatedDocument extends CourseBaseDocument {
  bootcamp: BootcampBaseDocument;
  owner: UserDocument;
}

export interface CourseModel extends mongoose.Model<CourseDocument> {
  updateAverageCost(bootcampId: mongoose.Types.ObjectId): Promise<void>;
}

// get average of course tuitions
CourseSchema.statics.updateAverageCost = async function (bootcampId) {
  const pipeline = [
    // step 1
    {
      $match: { bootcamp: bootcampId },
    },
    // step 2
    {
      $group: {
        _id: '$bootcamp',
        averageCost: { $avg: '$tuition' },
      },
    },
  ];
  // "this" is the Model
  const agg = await this.aggregate(pipeline);

  try {
    if (agg[0]) {
      await Bootcamp.findByIdAndUpdate(bootcampId, {
        averageCost: Math.ceil(agg[0].averageCost / 10) * 10,
      });
    } else {
      await Bootcamp.updateOne(
        { _id: bootcampId },
        {
          $unset: { averageCost: '' },
        }
      );
    }
  } catch (e) {
    console.error(e);
  }
};

// average cost after save
CourseSchema.post<CourseDocument>('save', function () {
  // "this" is the course document, "this.contstructor" is the model
  (this.constructor as CourseModel).updateAverageCost(this.bootcamp);
});

// average cost after remove
CourseSchema.post<CourseDocument>(
  'deleteOne',
  { document: true, query: false },
  function () {
    (this.constructor as CourseModel).updateAverageCost(this.bootcamp);
  }
);

CourseSchema.post<
  Query<UpdateResult, CourseDocument, {}, CourseDocument, 'findOneAndUpdate'>
>('findOneAndUpdate', async function () {
  const course = await this.model.findOne(this.getQuery());
  (this.model as CourseModel).updateAverageCost(course.bootcamp);
});

const model = mongoose.model('Course', CourseSchema);
export default model;
