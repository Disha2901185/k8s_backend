npm.cmd install
npm.cmd run prisma:generate
npx.cmd prisma migrate dev --name init
npm.cmd run prisma:seed
npm.cmd run start:dev


to Migrate new changes in Db
npx.cmd prisma migrate dev --name your_change_name
