# Staff, Base Shifts, and Roster Guide

This guide explains the intended admin flow in the current app:

1. Create the staff member
2. Assign their category and skills
3. Create reusable base shift templates
4. Build that person's recurring base schedule
5. Create the live roster from the roster grid using the individual base schedule action

## 1. Create a staff member

1. Open `Admin`.
2. Go to `Staff`.
3. Click `Add Staff`.
4. Complete the form:
   - `Full Name`
   - `Email Address`
   - `Employment Type`
   - `Roster Category`
   - `Max Weekly Hours`
   - `Hourly Rate`
   - `Skills / Departments`
5. Click `Create Staff Member`.

What this does:
- The staff member is added to the system.
- Their `Roster Category` controls where they appear in the roster grid.
- Their `Skills / Departments` define which departments they are linked to.

## 2. Assign or change the category

The category is selected when the staff member is created, but it can also be updated later.

1. Go to `Admin` -> `Staff`.
2. Find the staff member in the table.
3. Click the `Edit` button.
4. Update `Roster Category` if needed.
5. Save the changes.

Current roster categories in this build:
- `Management (MOD)`
- `Shift Manager (SMOD)`
- `Cafe`
- `Shop`
- `Front Desk`

How category is used:
- The roster grid groups staff by category.
- Full-time staff are shown first, then part-time staff.
- Inside each type, staff are grouped under their category heading.

## 3. Assign departments and skills

Departments and skills are separate from the roster category.

1. Go to `Admin` -> `Staff`.
2. Create the department first with `Add Department` if it does not already exist.
3. Create or edit the staff member.
4. Tick the relevant `Skills / Departments`.
5. Save the record.

Why this matters:
- Shift templates are tied to a department.
- A staff member's skills show what areas they can work in.

## 4. Create base shift templates

Before you can assign recurring base shifts, you need shift templates.

1. Open `Admin`.
2. Go to `Templates`.
3. In `Add New Shift Template`, complete:
   - `Template Name`
   - `Department`
   - `Start Time`
   - `End Time`
4. Click `Create Template`.

Examples:
- `Morning Shift` for `Front Desk`
- `Cafe Open` for `Cafe`
- `Shop Close` for `Shop`

What this does:
- Creates reusable shift patterns that can be assigned in the base schedule screen.

## 5. Create the recurring base schedule

This is where you define the person's normal weekly pattern.

1. Open `Admin`.
2. Go to `Base Schedule`.
3. Find the staff member in the left column.
4. Click the empty cell under the correct weekday.
5. In the modal, choose the correct template.
6. Click `Assign`.
7. Repeat for each day that person should normally work.

Useful behavior on this screen:
- Clicking an existing base shift opens it for editing.
- The `x` on a base shift removes that recurring rule.
- You can drag a base shift to another day or another staff member.

What this creates:
- A weekly recurring rule, not a live roster shift yet.
- Example: every Monday, assign Liam the `Morning Shift` template.

## 6. Create the schedule from the roster grid for one staff member

Once the recurring base schedule is set, you can generate actual roster shifts for one person from the roster screen.

1. Open `Admin`.
2. Go to `Roster`.
3. Choose the month you want to work on.
4. Find the staff member's row.
5. Click the `calendar plus` button on that row.
6. Review the confirmation modal.
7. Click `Create Base Schedule`.

What the individual roster action does:
- It creates shifts from that staff member's recurring base rules.
- It only creates shifts for that one staff member.
- It keeps any existing shifts already on the roster.
- It only fills missing shifts in the full visible roster window.

Important note:
- In the current build, this action uses the visible roster date range, not just the calendar month label.

## 7. Create the schedule for everyone (Only for intial roster)

If you want to generate the month from base rules for all staff instead of one person:

1. Open `Admin` -> `Roster`.
2. Select the month.
3. Click `Generate Schedule`.
4. Confirm the action.

What bulk generation does:
- Creates shifts based on base schedule rules.
- Does not overwrite existing shifts.

## 8. Recommended real-world workflow

For each new staff member, use this order:

1. Create the department if needed.
2. Create the staff member.
3. Set the correct roster category.
4. Assign skills and departments.
5. Create shift templates if they do not already exist.
6. Build the recurring base schedule in `Base Schedule`.
7. Open `Roster`.
8. Select the target month.
9. Use the individual `Create Base Schedule` action on that staff member's row.
10. Review the generated shifts and make any manual adjustments.

## 9. Expected outcome

After following the process:
- The staff member appears in the correct roster section.
- Their recurring weekly pattern is stored in `Base Schedule`.
- Their actual dated shifts are created on the roster grid when you run the individual generation action.
- Existing roster shifts stay in place and only missing shifts are added.
