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
