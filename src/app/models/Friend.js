import { Model } from 'sequelize';

class Friend extends Model {
  static init(sequelize) {
    super.init(
      {},
      {
        sequelize,
      }
    );

    return this;
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'user_id' });
    this.belongsTo(models.User, { foreignKey: 'friend_id' });
  }
}

export default Friend;
