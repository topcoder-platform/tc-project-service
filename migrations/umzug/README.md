# Migration Guide

This project uses **Sequelize** with **Umzug** for managing database migrations.

## **📌 How to Add a New Migration**

1. **Generate a new migration file**
   
   cd into `migrations/umzug/` directory and run:

   ```sh
   npx sequelize-cli migration:generate --name your_migration_name
   ```

   This will create a new migration file inside `umzug/migrations/`.

2. **Modify the generated migration file**

   - Open the file inside `umzug/migrations/`.
   - Define the required table changes inside the `up` method.
   - Define how to revert the changes in the `down` method.

   **Example:** Creating a `users` table

   ```javascript
   module.exports = {
     up: async (queryInterface, Sequelize) => {
       await queryInterface.createTable("users", {
         id: {
           type: Sequelize.BIGINT,
           allowNull: false,
           primaryKey: true,
           autoIncrement: true,
         },
         name: {
           type: Sequelize.STRING,
           allowNull: false,
         },
         createdAt: {
           type: Sequelize.DATE,
           allowNull: true,
         },
         updatedAt: {
           type: Sequelize.DATE,
           allowNull: true,
         }
       });
     },
     down: async (queryInterface, Sequelize) => {
       await queryInterface.dropTable("users");
     }
   };
   ```

3. **Test Migrations**

   ```sh
   npm run migrate
   ```

   This will apply all pending migrations.

4. **Rollback Migrations (If Needed)**

   ```sh
   npm run migrate:down
   ```

   This will revert the last applied migration.

5. **Revert All Migrations (If Needed)**

    If you need to revert all applied migrations, run:

   ```sh
    npm run migrate:reset
   ```

This will undo all migrations in reverse order.

---

## **📌 How Migrations Work in This Project**

- All migration files are stored in `umzug/migrations/`.
- The migration runner is inside `umzug/index.js`.
- After installing dependencies (`npm install`), migrations will **automatically run** via `postinstall`.

---
