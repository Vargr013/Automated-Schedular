# Automated Scheduler

A comprehensive staff scheduling and management application built with Next.js, Prisma, and PostgreSQL.

## Project Overview

This application helps organizations manage staff rosters, leave requests, shift templates, and monthly budgets. It features an automated scheduling engine that assigns shifts based on employee availability, skills, and department requirements.

## Key Features

### Roster Management
- Visual roster grid for managing daily shifts.
- Automated scheduling based on predefined rules.
- Support for multiple departments (Front Desk, Housekeeping, Maintenance, Kitchen).
- Drag-and-drop shift adjustments.
- Excel and PDF export functionality.

### Leave Management
- Staff can submit leave requests.
- Administrators can approve, decline, or edit leave requests.
- Filter leave requests by status, type, and month.
- Leave affects availability for the auto-scheduler.

### Budgeting
- Track monthly potential budgets versus actual scheduled costs.
- Set hourly rates for employees.
- Monitor costs per department and employment type (Full-time vs Part-time).

### Administration
- Manage staff profiles, skills, and constraints.
- configure shift templates and operating hours.
- Define automation rules for minimum staffing levels.

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **UI Components**: Custom components with CSS modules
- **Authentication**: NextAuth.js

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   npm install

3. Set up environment variables:
   Create a .env file and add your database URL and NextAuth secret.

4. Initialize the database:
   npx prisma generate
   npx prisma db push

5. Run the development server:
   npm run dev

6. Open http://localhost:3000 in your browser.

## Scripts

- npm run dev: Starts the development server.
- npm run build: Builds the application for production.
- npm run start: Starts the production server.
- npm run lint: Runs the linter to check for code issues.

## Local Dev Database

This repo can run against a dedicated local Postgres clone instead of the hosted database.

### What it does

- Starts a local Postgres container on port `54329`
- Clones the current remote database into a local database called `scheduler_dev`
- Optionally rewrites `.env.local` so the app uses the local clone
- Syncs both `.env.local` and `.env` when you use `-WriteLocalEnv`, so Prisma CLI and Next.js point at the same local database

### Files

- `docker-compose.local-db.yml`: local Postgres container config
- `scripts/clone-remote-to-local-db.ps1`: remote-to-local clone script
- `env.localdb.example`: example local database env values

### Prerequisites

- Docker Desktop installed and running
- Remote database env vars available in `.env.local` or your shell

### Clone the hosted DB into a local dev DB

From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\clone-remote-to-local-db.ps1 -WriteLocalEnv
```

If you do not want the script to edit `.env.local`, omit `-WriteLocalEnv` and copy the values from `env.localdb.example` manually.

### Start the app against the local clone

```powershell
npx prisma generate
npm run dev
```

### Useful Docker commands

```powershell
docker start scheduler-local-db
docker stop scheduler-local-db
docker rm -f scheduler-local-db
docker volume rm scheduler-app_scheduler_local_postgres
```
