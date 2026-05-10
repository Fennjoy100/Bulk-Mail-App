# Bulk Mail App

A Vercel-ready full-stack bulk mail application built with React, Express, MongoDB, and Nodemailer.

## Features

- Compose and send bulk emails from a React dashboard
- Validate subject, body, and recipient inputs
- Store delivery logs in MongoDB
- View recent send history with sent, partial, and failed states
- Run locally with Vite + Express and deploy on Vercel

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Email: Nodemailer
- Deployment: Vercel serverless functions

## Environment Variables

Copy `.env.example` to `.env` and set the values:

- `PORT`
- `MONGODB_URI`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

For Gmail, use an app password instead of your regular password.

## Local Setup

```bash
npm install
npm install --prefix client
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Vercel Deployment

1. Push this project to GitHub.
2. Import the repository into your Vercel account.
3. In the Vercel project settings, add the environment variables from `.env.example`.
4. Ensure your MongoDB database is reachable from Vercel, typically with MongoDB Atlas.
5. Deploy. Vercel will build the React app and serve the API from `api/index.js`.

You can connect it under your Vercel workspace at `https://vercel.com/fennjoy100s-projects`.
