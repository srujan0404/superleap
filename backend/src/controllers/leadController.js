import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import * as svc from '../services/leadService.js';
import { STATUSES } from '../models/Lead.js';

const createSchema = z.object({
  name:   z.string().min(1).trim(),
  email:  z.string().email().toLowerCase().trim(),
  phone:  z.string().trim().optional(),
  source: z.string().trim().optional(),
});

const updateSchema = createSchema.partial().passthrough();

const listQuerySchema = z.object({
  status: z.string().optional(),
  source: z.string().optional(),
  limit:  z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const transitionSchema = z.object({
  status: z.enum(STATUSES),
});

export const validateCreate = validate(createSchema);
export const validateUpdate = validate(updateSchema);
export const validateListQuery = validate(listQuerySchema, 'query');
export const validateTransition = validate(transitionSchema);

export async function create(req, res, next) {
  try {
    const lead = await svc.createLead(req.body);
    res.status(201).json(lead);
  } catch (err) { next(err); }
}

export async function list(req, res, next) {
  try {
    const leads = await svc.listLeads(req.query);
    res.json(leads);
  } catch (err) { next(err); }
}

export async function getOne(req, res, next) {
  try {
    const lead = await svc.getLeadById(req.params.id);
    res.json(lead);
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const lead = await svc.updateLead(req.params.id, req.body);
    res.json(lead);
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    await svc.deleteLead(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function transition(req, res, next) {
  try {
    const lead = await svc.transitionStatus(req.params.id, req.body.status);
    res.json(lead);
  } catch (err) { next(err); }
}

export async function bulkCreate(req, res, next) {
  try {
    const result = await svc.bulkCreate(req.body);
    res.json(result);
  } catch (err) { next(err); }
}

export async function bulkUpdate(req, res, next) {
  try {
    const result = await svc.bulkUpdate(req.body);
    res.json(result);
  } catch (err) { next(err); }
}
