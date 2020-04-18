import User from '../models/User';
import Friend from '../models/Friend';

class FriendController {
  async index(req, res) {
    const userFriends = await Friend.findAll({
      where: { user_id: req.user_id },
    });

    if (!userFriends || !userFriends.length) {
      return res.status(200).json({ friends: [] });
    }

    const friendsIds = userFriends.map(friend => friend.friend_id);

    const friends = await User.findAll({
      where: { id: friendsIds },
    });

    return res.status(200).json({
      friends,
    });
  }

  async show(req, res) {
    const { friend_id } = req.params;

    const friend = await User.findAll({
      where: { friend_id },
    });

    return res.status(200).json({
      friend,
    });
  }

  async store(req, res) {
    const { email } = req.body;
    const friend = await User.findOne({
      where: { email },
      raw: true,
    });

    if (!friend.id) {
      return res.status(400).json({ error: 'Email not valid.' });
    }

    await Friend.create({
      user_id: req.user_id,
      friend_id: friend.id,
    });

    await Friend.create({
      user_id: friend.id,
      friend_id: req.user_id,
    });

    return res.json(friend);
  }
}

export default new FriendController();
