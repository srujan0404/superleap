import { Router } from 'express';
import * as c from '../controllers/leadController.js';

const router = Router();

router.post('/',          c.validateCreate, c.create);
router.get('/',           c.validateListQuery, c.list);
router.post('/bulk',      c.bulkCreate);
router.put('/bulk',       c.bulkUpdate);
router.get('/:id',        c.getOne);
router.put('/:id',        c.validateUpdate, c.update);
router.delete('/:id',     c.remove);
router.patch('/:id/status', c.validateTransition, c.transition);

export default router;
