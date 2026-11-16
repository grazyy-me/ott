import express from 'express';
import auth from '../../middlewares/auth.js';
import validate from '../../middlewares/validate.js';
import { uploadImage } from '../../middlewares/upload.js';
import * as userValidation from '../../validations/user.validation.js';
import * as userController from '../../controllers/user.controller.js';

const router = express.Router();

// Current user (must be declared before /:userId)
router
  .route('/me')
  .get(auth(), userController.getMe)
  .patch(auth(), validate(userValidation.updateMe), userController.updateMe);
router.patch('/me/avatar', auth(), uploadImage('avatar'), userController.updateMyAvatar);

// Admin
router
  .route('/')
  .post(auth('manageUsers'), validate(userValidation.createUser), userController.createUser)
  .get(auth('getUsers'), validate(userValidation.getUsers), userController.getUsers);

router
  .route('/:userId')
  .get(auth('getUsers'), validate(userValidation.getUser), userController.getUser)
  .patch(auth('manageUsers'), validate(userValidation.updateUser), userController.updateUser)
  .delete(auth('manageUsers'), validate(userValidation.deleteUser), userController.deleteUser);

export default router;
