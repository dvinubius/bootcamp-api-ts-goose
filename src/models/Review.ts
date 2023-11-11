import mongoose, { Query } from 'mongoose';
import Bootcamp, { BootcampBaseDocument } from './Bootcamp.js';
import { UserDocument } from './User.js';
import { UpdateResult } from 'mongodb';

const ReviewSchema = new mongoose.Schema<ReviewDocument, ReviewModel>({
  title: {
    type: String,
    trim: true,
    required: [true, 'Please add a review title'],
    maxLength: 100,
  },
  text: {
    type: String,
    required: [true, 'Please add some text'],
  },
  rating: {
    type: Number,
    min: 1,
    max: 10,
    required: [true, 'Please add a rating between 1 and 10'],
  },
  bootcamp: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bootcamp',
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

// prevents user from posting multiple reviews per bootcamp
ReviewSchema.index({ bootcamp: 1, author: 1 }, { unique: true });

export interface IReview {
  title: string;
  text: string;
  rating: number;
  bootcamp: mongoose.Types.ObjectId | Record<string, unknown>;
  author: mongoose.Types.ObjectId | Record<string, unknown>;
}

interface ReviewBaseDocument extends IReview, mongoose.Document {
  bootcamp: BootcampBaseDocument['_id'] | BootcampBaseDocument;
  author: UserDocument['_id'] | UserDocument;
}

export interface ReviewDocument extends ReviewBaseDocument {
  bootcamp: BootcampBaseDocument['_id'];
  author: UserDocument['_id'];
}

export interface ReviewPopulatedDocument extends ReviewBaseDocument {
  bootcamp: BootcampBaseDocument;
  author: UserDocument;
}

export interface ReviewModel extends mongoose.Model<ReviewDocument> {
  updateAverageRating(bootcampId: mongoose.Types.ObjectId): Promise<void>;
}

// get average of review ratings per bootcamp
ReviewSchema.statics.updateAverageRating = async function (
  this: mongoose.Model<ReviewDocument>,
  bootcampId
) {
  const pipeline = [
    // step 1
    {
      $match: { bootcamp: bootcampId },
    },
    // step 2
    {
      $group: {
        _id: '$bootcamp',
        averageRating: { $avg: '$rating' },
      },
    },
  ];
  // "this" is the Model
  const agg = await this.aggregate(pipeline);

  try {
    if (agg[0]) {
      await Bootcamp.findByIdAndUpdate(bootcampId, {
        averageRating: agg[0].averageRating,
      });
    } else {
      await Bootcamp.updateOne(
        { _id: bootcampId },
        {
          $unset: { averageRating: '' },
        }
      );
    }
  } catch (e) {
    console.error(e);
  }
};

// average review after save
ReviewSchema.post<ReviewDocument>('save', function () {
  // "this" is the course document, "this.constructor" is the Model
  (this.constructor as ReviewModel).updateAverageRating(this.bootcamp);
});

// average rating after remove
ReviewSchema.post<ReviewDocument>(
  'deleteOne',
  { document: true, query: false },
  function () {
    (this.constructor as ReviewModel).updateAverageRating(this.bootcamp);
  }
);

// average rating after update
ReviewSchema.post<
  Query<UpdateResult, ReviewDocument, {}, ReviewDocument, 'findOneAndUpdate'>
>('findOneAndUpdate', async function () {
  const review = await this.model.findOne(this.getQuery());
  (this.model as ReviewModel).updateAverageRating(review.bootcamp);
});

const model = mongoose.model('Review', ReviewSchema);
export default model;
