# Mini Booking System

A meeting room booking application built with Next.js, TypeScript, Tailwind CSS, and PostgreSQL.

## Features

- View meeting rooms and booking records.
- Create meeting room bookings.
- Prevent bookings with invalid time ranges.
- Prevent overlapping bookings for the same room.
- View booking statistics and calendar schedules.
- Delete existing bookings.

## Requirements

- Node.js and npm
- PostgreSQL
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/bhavalisha13/mini-boooking-system.git
cd mini-boooking-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root and add your PostgreSQL connection string:

```env
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME
```

Replace `USERNAME`, `PASSWORD`, `HOST`, and `DATABASE_NAME` with your PostgreSQL database details.

For a local PostgreSQL installation, the host is usually `localhost` and the default port is `5432`.

Do not commit your `.env` file or publish database credentials.

### 4. Set up the database

Create a PostgreSQL database, then run:

```bash
node db/migrate.mjs
```

This command creates the required database tables using `db/migrations/001_create_tables.sql`.

Make sure PostgreSQL is running and `DATABASE_URL` points to the database you created.

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```text
app/
  api/
    bookings/
      route.ts
      [id]/
        route.ts
  globals.css
  layout.tsx
  page.tsx
db/
  migrations/
    001_create_tables.sql
  migrate.mjs
lib/
public/
```

## Database

The application uses PostgreSQL to store meeting room resources and booking records.

## License

No license has been specified yet.
