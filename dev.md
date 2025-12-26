1. npm create vite@latest frontend -- --template react-ts

2. mkdir backend and cd backend
3. npm init -y
4. npm install express typescript ts-node-dev @types/express @types/node
5. npm install prisma @prisma/client pg socket.io jsonwebtoken bcryptjs dotenv cors cloudinary multer
6. npm install -D prisma @types/bcryptjs @types/jsonwebtoken @types/cors

7. npx tsc --init
8. npx prisma init

9. cd frontend --> npm install
npm run dev

10. cd backend --> npm install
npm run dev

11. error backend, miss src/server.ts
npm install express dotenv
npm install -D typescript ts-node-dev @types/express @types/node

12. backend
npm install prisma @prisma/client
npm install -D prisma

npx prisma migrate dev --name init
npx prisma generate