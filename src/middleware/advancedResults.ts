import { Model } from 'mongoose';
import { Request, NextFunction } from 'express';
import { ErrorResponse } from '../utils/error-response.js';
import { ResponseCT } from '../types/response-custom-type.type.js';

export type AdvancedResults = {
  success: boolean;
  count: number;
  data: any[];
  pagination: {
    next?: {
      page: number;
      limit: number;
    };
    prev?: {
      page: number;
      limit: number;
    };
  };
};

type PopulateArg = string | { path: string; select?: string };

export default (model: Model<any>, populateArgs: PopulateArg[]) =>
  async (req: Request, res: ResponseCT, next: NextFunction) => {
    // remove special query fields
    const reqQuery = { ...req.query };
    const removeFields = ['select', 'sort', 'limit', 'page'];
    removeFields.forEach((param) => delete reqQuery[param]);

    let queryStr = JSON.stringify(reqQuery);
    // mongoose operators
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in)\b/,
      (match) => `$${match}`
    );

    let query = model.find(JSON.parse(queryStr));

    // SELECT FIEDS
    if (req.query.select) {
      if (typeof req.query.select !== 'string') {
        throw new ErrorResponse('select query param must be a string', 400);
      }
      // turn comma separated into space separated
      const fields = req.query.select.replace(/,/g, ' ');
      query = query.select(fields);
    }

    // SORT RESULTS
    let sortBy = '-createdAt';
    if (req.query.sort) {
      if (typeof req.query.sort !== 'string') {
        throw new ErrorResponse('sort query param must be a string', 400);
      }
      sortBy = req.query.sort.replace(/,/g, ' ');
    }
    query = query.sort(sortBy);

    // PAGINATION
    const pageParam = req.query.page || '1';
    const limitParam = req.query.limit || '100';
    if (
      (pageParam && typeof pageParam !== 'string') ||
      (limitParam && typeof limitParam !== 'string')
    ) {
      throw new ErrorResponse('page and limit params must be strings', 400);
    }
    const page = parseInt(pageParam, 10);
    const limit = parseInt(limitParam, 10);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await model.countDocuments();

    query = query.skip(startIndex).limit(limit);

    if (populateArgs) {
      for (const popArg of populateArgs) {
        const term = typeof popArg === 'string' ? popArg : popArg.path;
        const excludePopulate =
          req.query.select && !req.query.select.split(',').includes(term);
        if (!excludePopulate) {
          query.populate(term);
        }
      }
    }

    let results = await query;

    // Pagination result
    type Page = { page: number; limit: number };
    const pagination: {
      next?: Page;
      prev?: Page;
    } = {};
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.advancedResults = {
      success: true,
      count: results.length,
      pagination,
      data: results,
    };
    next();
  };
