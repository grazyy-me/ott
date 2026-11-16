import express from 'express';
import auth from '../../middlewares/auth.js';
import validateZod from '../../middlewares/validateZod.js';
import * as billingValidation from '../../validations/billing.validation.js';
import * as billingController from '../../controllers/billing.controller.js';

// Mounted at /v1/billing. The webhook is registered in app.js instead (it needs the raw body).
const router = express.Router();

router.get('/plans', billingController.plans);
router.post('/subscribe', auth(), validateZod(billingValidation.subscribe), billingController.subscribe);
router.post('/verify', auth(), validateZod(billingValidation.verify), billingController.verify);
router.get('/me', auth(), billingController.me);
router.post('/cancel', auth(), billingController.cancel);

export default router;
