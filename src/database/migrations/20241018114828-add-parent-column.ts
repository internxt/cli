import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
    await queryInterface.addColumn('folders', 'parent_uuid', {
      type: Sequelize.UUIDV4,
      references: {
        model: 'folders',
        key: 'uuid',
      },
    });
    await queryInterface.addColumn('files', 'folder_uuid', {
      type: Sequelize.UUIDV4,
      references: {
        model: 'files',
        key: 'uuid',
      },
    });
  },
  async down(queryInterface: QueryInterface) {
    await queryInterface.removeColumn('folders', 'parent_uuid');
    await queryInterface.removeColumn('files', 'folder_uuid');
  },
};
