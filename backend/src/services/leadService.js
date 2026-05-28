import mongoose from 'mongoose';
import { Lead, STATUSES } from '../models/Lead.js';
import {
  BadRequestError, ConflictError, NotFoundError, TransitionError, ValidationError,
} from '../lib/errors.js';
import { canTransition } from '../lib/stateMachine.js';
import { cache } from '../lib/cache.js';

const keyFor = (id) => `lead:${id}`;

function assertValidObjectId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new BadRequestError(`Invalid id: ${id}`);
  }
}

function mongooseValidationToDetails(err) {
  return Object.entries(err.errors).map(([path, e]) => ({
    path,
    message: e.message,
  }));
}

export async function createLead(input) {
  try {
    const lead = await Lead.create(input);
    return lead.toJSON();
  } catch (err) {
    if (err?.name === 'ValidationError') {
      throw new ValidationError('Validation failed', mongooseValidationToDetails(err));
    }
    throw err;
  }
}

export async function listLeads({ status, source, limit = 50, offset = 0 } = {}) {
  if (status !== undefined && !STATUSES.includes(status)) {
    throw new BadRequestError(`Unknown status: ${status}`);
  }
  const query = {};
  if (status) query.status = status;
  if (source) query.source = source;
  const docs = await Lead.find(query)
    .sort({ created_at: -1 })
    .skip(offset)
    .limit(Math.min(limit, 200));
  return docs.map(d => d.toJSON());
}

export async function getLeadById(id) {
  assertValidObjectId(id);
  const cached = await cache.get(keyFor(id));
  if (cached) return cached;
  const lead = await Lead.findById(id);
  if (!lead) throw new NotFoundError('Lead not found');
  const json = lead.toJSON();
  await cache.set(keyFor(id), json);
  return json;
}

export async function updateLead(id, updates) {
  assertValidObjectId(id);
  if ('status' in updates) {
    throw new BadRequestError('Use PATCH /leads/:id/status to change status');
  }
  try {
    const lead = await Lead.findByIdAndUpdate(id, updates, {
      new: true, runValidators: true,
    });
    if (!lead) throw new NotFoundError('Lead not found');
    await cache.del(keyFor(id));
    return lead.toJSON();
  } catch (err) {
    if (err?.name === 'ValidationError') {
      throw new ValidationError('Validation failed', mongooseValidationToDetails(err));
    }
    throw err;
  }
}

export async function deleteLead(id) {
  assertValidObjectId(id);
  const result = await Lead.findByIdAndDelete(id);
  if (!result) throw new NotFoundError('Lead not found');
  await cache.del(keyFor(id));
}

export async function transitionStatus(id, toStatus) {
  assertValidObjectId(id);
  if (!STATUSES.includes(toStatus)) {
    throw new BadRequestError(`Unknown status: ${toStatus}`);
  }
  const current = await Lead.findById(id);
  if (!current) throw new NotFoundError('Lead not found');
  if (!canTransition(current.status, toStatus)) {
    throw new TransitionError(
      `Invalid status transition from ${current.status} to ${toStatus}`,
    );
  }
  const updated = await Lead.findOneAndUpdate(
    { _id: id, status: current.status },
    { $set: { status: toStatus } },
    { new: true },
  );
  if (!updated) {
    throw new ConflictError('Lead status changed concurrently, retry');
  }
  await cache.del(keyFor(id));
  return updated.toJSON();
}

const BULK_MAX = 500;

function formatBulkError(err) {
  if (err instanceof ValidationError && Array.isArray(err.details)) {
    return err.details.map(d => `${d.path}: ${d.message}`).join('; ');
  }
  if (err?.name === 'ValidationError' && err.errors) {
    return mongooseValidationToDetails(err)
      .map(d => `${d.path}: ${d.message}`).join('; ');
  }
  return err?.message ?? 'Unknown error';
}

function wrapBulkResponse(results) {
  return {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
}

export async function bulkCreate(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new BadRequestError('Body must be a non-empty array');
  }
  if (records.length > BULK_MAX) {
    throw new BadRequestError(`Too many records (max ${BULK_MAX})`);
  }
  const results = await Promise.all(records.map(async (record, index) => {
    try {
      const lead = await createLead(record);
      return { index, success: true, lead };
    } catch (err) {
      return { index, success: false, error: formatBulkError(err) };
    }
  }));
  return wrapBulkResponse(results);
}

export async function bulkUpdate(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new BadRequestError('Body must be a non-empty array');
  }
  if (records.length > BULK_MAX) {
    throw new BadRequestError(`Too many records (max ${BULK_MAX})`);
  }
  const results = await Promise.all(records.map(async (record, index) => {
    try {
      if (!record || typeof record !== 'object' || !record.id) {
        throw new BadRequestError('Each record must include an id');
      }
      const { id, ...rest } = record;
      const lead = await updateLead(id, rest);
      return { index, success: true, lead };
    } catch (err) {
      return { index, success: false, error: formatBulkError(err) };
    }
  }));
  return wrapBulkResponse(results);
}
