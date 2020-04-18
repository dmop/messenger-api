import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import redis from 'redis';
import RateLimit from 'express-rate-limit';
import RateLimitRedis from 'rate-limit-redis';
import Youch from 'youch';
import * as Sentry from '@sentry/node';
import 'express-async-errors';
import http from 'http';
import SocketIo from 'socket.io';
import morgan from 'morgan';
import { Op } from 'sequelize';
import routes from './routes';
import sentryConfig from './config/sentry';

import './database';

import Message from './app/models/Message';

class App {
  constructor() {
    this.server = express();
    this.rooms = {};

    Sentry.init(sentryConfig);

    this.middlewares();
    this.webSocket();
    this.routes();
    this.exceptionHandler();
  }

  middlewares() {
    this.server.use(Sentry.Handlers.requestHandler());
    this.server.use(helmet());
    this.server.use(cors());
    this.server.use(express.json());
    this.server.use(morgan('tiny'));

    if (process.env.NODE_ENV !== 'development') {
      this.server.use(
        new RateLimit({
          store: new RateLimitRedis({
            client: redis.createClient({
              host: process.env.REDIS_HOST,
              port: process.env.REDIS_PORT,
            }),
          }),
          windowMs: 1000 * 60 * 15,
          max: 100,
        })
      );
    }
  }

  routes() {
    this.server.use(routes);
    this.server.use(Sentry.Handlers.errorHandler());
  }

  webSocket() {
    this.serverIo = http.Server(this.server);
    this.io = SocketIo(this.serverIo);

    this.io.on('connection', async socket => {
      console.log(socket.id);

      const getMessages = async ({ user_id, friend_id }) => {
        let messages = await Message.findAll({
          where: {
            [Op.or]: [
              {
                [Op.and]: [
                  { sent_user_id: user_id },
                  { received_user_id: friend_id },
                ],
              },
              {
                [Op.and]: [
                  { received_user_id: user_id },
                  { sent_user_id: friend_id },
                ],
              },
            ],
          },
          raw: true,
          order: [['created_at', 'ASC']],
        });

        if (messages.length) {
          messages = messages.map(message => {
            message.from_user = message.sent_user_id === user_id;
            return message;
          });
        }

        return messages;
      };

      socket.on('CREATE_CHAT', async data => {
        let room = `${data.user_id}_${data.friend_id}`;

        if (data.user_id > data.friend_id) {
          room = `${data.friend_id}_${data.user_id}`;
        }

        this.rooms[room] = true;
        socket.join(room);

        const messages = await getMessages({
          room,
          user_id: data.user_id,
          friend_id: data.friend_id,
        });

        this.io.to(room).emit('LIST_MESSAGES', {
          messages,
          room,
        });
      });

      socket.on('SENDING_MESSAGE', async data => {
        let room = `${data.user_id}_${data.friend_id}`;

        if (data.user_id > data.friend_id) {
          room = `${data.friend_id}_${data.user_id}`;
        }

        await Message.create({
          sent_user_id: data.user_id,
          received_user_id: data.friend_id,
          message: data.message,
        });

        const messages = await getMessages({
          room,
          user_id: data.user_id,
          friend_id: data.friend_id,
        });

        this.io.to(room).emit('LIST_MESSAGES', {
          messages,
          room,
        });
      });
    });
  }

  exceptionHandler() {
    this.server.use(async (err, req, res, next) => {
      if (process.env.NODE_ENV === 'development') {
        const errors = await new Youch(err, req).toJSON();

        return res.status(500).json(errors);
      }

      return res.status(500).json({ error: 'Internal server error' });
    });
  }
}

export default new App();
