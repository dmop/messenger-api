import { Op } from 'sequelize';

import Message from '../models/Message';

class MessageController {
  async index(req, res) {
    const { friend_id } = req.query;

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          {
            [Op.and]: [
              { sent_user_id: req.user_id },
              { received_user_id: friend_id },
            ],
          },
          {
            [Op.and]: [
              { received_user_id: req.user_id },
              { sent_user_id: friend_id },
            ],
          },
        ],
      },
      order: [['created_at', 'ASC']],
    });

    return res.json({ messages });
  }

  async store(req, res) {
    const { message, friend_id } = req.body;

    if (!friend_id) {
      return res.status(400).json({ error: 'User not exists.' });
    }

    await Message.create({
      message,
      sent_user_id: req.user_id,
      received_user_id: friend_id,
    });

    return res.json({ message: 'success' });
  }
}

export default new MessageController();
