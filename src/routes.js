import { Router } from 'express';

import UserController from './app/controllers/UserController';
import SessionController from './app/controllers/SessionController';
import FriendController from './app/controllers/FriendController';
import MessageController from './app/controllers/MessageController';

import validateUserStore from './app/validators/UserStore';
import validateSessionStore from './app/validators/SessionStore';

import authMiddleware from './app/middlewares/auth';

const routes = new Router();

routes.post('/users', validateUserStore, UserController.store);
routes.post('/sessions', validateSessionStore, SessionController.store);

routes.use(authMiddleware);

routes.get('/friends', FriendController.index);
routes.get('/friends/:friend_id', FriendController.show);
routes.post('/friends', FriendController.store);

routes.get('/messages', MessageController.index);
routes.post('/messages', MessageController.store);

export default routes;
