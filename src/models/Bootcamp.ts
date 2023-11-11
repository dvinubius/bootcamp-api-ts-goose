import mongoose, { Query } from 'mongoose';
import slugify from 'slugify';
import geocoder from '../utils/geocoder.js';
import { CAREERS, Career } from '../types/career.enum.type.js';
import { Location } from '../types/location.type.js';
import { DeleteResult, UpdateResult } from 'mongodb';
import { UserDocument } from './User.js';
import Course from './Course.js';

const BootcampSchema = new mongoose.Schema<BootcampDocument, BootcampModel>(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      unique: true,
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    slug: String,
    description: {
      type: String,
      required: [true, 'Please add a description'],
      maxlength: [500, 'Name cannot be more than 500 characters'],
    },
    website: {
      type: String,
      match: [
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
        'Please use a valid URL with HTTP or HTTPS',
      ],
    },
    phone: {
      type: String,
      maxlength: [20, 'Phone number can not be longer than 20 characters'],
    },
    email: {
      type: String,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    address: String,
    location: {
      // GeoJSON Point
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        index: '2dsphere',
      },
      formattedAddress: String,
      street: String,
      city: String,
      zipcode: String,
      country: String,
    },
    careers: {
      // Array of strings
      type: [String],
      required: true,
      enum: CAREERS,
    },
    averageRating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [10, 'Rating must can not be more than 10'],
    },
    averageCost: Number,
    photo: {
      type: String,
      default: 'no-photo.jpg',
    },
    housing: {
      type: Boolean,
      default: false,
    },
    jobAssistance: {
      type: Boolean,
      default: false,
    },
    jobGuarantee: {
      type: Boolean,
      default: false,
    },
    acceptGi: {
      type: Boolean,
      default: false,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export interface BootcampDto {
  name: string;
  description: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  careers: Career[];
  photo: string;
  housing: boolean;
  jobAssistance: boolean;
  jobGuarantee: boolean;
  acceptGi: boolean;
}

// Document interface
export interface IBootcamp extends BootcampDto {
  // on create
  slug: string;
  // on create
  location: Location;
  // on participant rating given
  averageRating: number;
  // on course added
  averageCost: number;
  // on create
  owner: mongoose.Types.ObjectId | Record<string, unknown>;
  // on participant joining
  participants: (mongoose.Types.ObjectId | Record<string, unknown>)[];
}

/**
 * Not directly exported because it is not recommended to
 * use this interface direct unless necessary since the
 * type of `owner` and 'participants' field types are not determined.
 */
export interface BootcampBaseDocument extends IBootcamp, mongoose.Document {
  courses: mongoose.Types.Map<string>;
  owner: UserDocument['_id'] | UserDocument;
  participants: (UserDocument['_id'] | UserDocument)[];
}

// Export this for strong typing
export interface BootcampDocument extends BootcampBaseDocument {
  owner: UserDocument['_id'];
  participants: UserDocument['_id'][];
}

// Export this for strong typing
export interface BootcampPopulatedDocument extends BootcampBaseDocument {
  owner: UserDocument;
  participants: UserDocument[];
}

// virtual - Reverse populate
BootcampSchema.virtual('courses', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'bootcamp',
  justOne: false,
});

// For model
export interface BootcampModel extends mongoose.Model<BootcampDocument> {}

const getLocationUpdate = async (inputAddress: string) => {
  const loc = await geocoder.geocode(inputAddress);
  const locData = validateLocation(loc[0], inputAddress);

  const location: Location = {
    type: 'Point',
    coordinates: [locData.longitude, locData.latitude],
    formattedAddress: locData.formattedAddress,
    street: locData.streetName ?? '', // some legit addresses don't have streetName
    city: locData.city,
    zipcode: locData.zipcode,
    country: locData.countryCode,
  };

  const address = loc[0].formattedAddress ?? inputAddress;
  return { location, address };
};

BootcampSchema.pre<BootcampDocument>('save', async function (next) {
  this.slug = slugify.default(this.name, { lower: true });
  const { location, address } = await getLocationUpdate(this.address);
  this.location = location;
  this.address = address;
  next();
});

BootcampSchema.pre<
  Query<
    UpdateResult,
    BootcampDocument,
    {},
    BootcampDocument,
    'findOneAndUpdate'
  >
>('findOneAndUpdate', async function (next) {
  // validation could be more thorough here
  const update = this.getUpdate() as { [key in keyof BootcampDto]?: any };
  if (!update) {
    next();
    return;
  }
  const additionalUpdate: {
    slug?: string;
    location?: Location;
    address?: string;
  } = {};
  if (update.name) {
    additionalUpdate.slug = slugify.default(update.name, { lower: true });
  }
  if (update.address) {
    Object.assign(additionalUpdate, await getLocationUpdate(update.address));
  }

  this.setUpdate({
    ...update,
    ...additionalUpdate,
  });
  next();
});

// no type exported for node_geocoder.Entry
const validateLocation = (entry: any, address: string) => {
  const ok =
    entry.longitude &&
    entry.latitude &&
    entry.formattedAddress &&
    entry.city &&
    entry.zipcode &&
    entry.countryCode;
  if (!ok) {
    throw new Error(
      `Google API could not properly decode geo location from address: ${address}`
    );
  }
  return entry;
};

// cascade delete courses when bootcamp is deleted
BootcampSchema.pre<
  Query<DeleteResult, BootcampDocument, {}, BootcampDocument, 'deleteOne'>
>('deleteOne', async function (next) {
  // "this" refers to the query in case of 'deleteOne' (latest mongoose version)
  const docToDelete = await this.model.findOne(this.getQuery());
  await Course.deleteMany({ bootcamp: docToDelete._id });
  next();
});

const model = mongoose.model<BootcampDocument, BootcampModel>(
  'Bootcamp',
  BootcampSchema
);
export default model;
