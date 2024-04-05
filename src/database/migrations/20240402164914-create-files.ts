import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
    await queryInterface.createTable('files', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING,
      },
      type: {
        type: Sequelize.STRING(24),
        allowNull: true,
      },
      uuid: {
        type: Sequelize.UUIDV4,
        unique: true,
      },
      file_id: {
        type: Sequelize.STRING(24),
      },
      folder_id: {
        type: Sequelize.INTEGER,
      },
      bucket: {
        type: Sequelize.STRING(24),
      },
      relative_path: {
        type: Sequelize.TEXT,
      },
      size: {
        type: Sequelize.BIGINT,
      },
      status: {
        type: Sequelize.ENUM,
        values: ['EXISTS', 'TRASHED', 'DELETED'],
        defaultValue: 'EXISTS',
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
      },
      updated_at: {
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface: QueryInterface) {
    await queryInterface.dropTable('files');
  },
};
