# South Central PA Chapter of Volleyball Officials Website

This is a full-stack starter website for the South Central PA Chapter of Volleyball Officials.

## Included

- Public home page
- Training & Education section
- Rating Sessions section
- Public chapter roster
- Admin area for posting training/rating sessions
- Admin Excel roster upload (.xlsx / .xls)
- SQLite database for persistent training and roster data
- Responsive desktop/mobile design

## Run locally

1. Install Node.js 18+.
2. Open a terminal in this folder.
3. Run:

   npm install

4. Copy `.env.example` to `.env`.
5. Set a strong `ADMIN_PASSWORD`.
6. Start the site:

   npm start

7. Visit:

   http://localhost:3000

## Excel roster

The first worksheet of the uploaded Excel file is read. The first row should contain the column headings you want displayed publicly, for example:

First Name | Last Name | Email | Phone | NCAA Rating | College Assignments

The roster is stored in the SQLite database and is visible to anyone visiting the public Roster section.

## Important before going public

The included admin password is intentionally simple so the project is easy to understand. Before deploying publicly, use a strong secret and preferably replace this with real administrator authentication.

For production, I would also recommend deciding which roster fields should be public. Email addresses and phone numbers should generally only be displayed if the chapter wants them publicly available.

## Suggested next upgrades

- Chapter logo
- Official contact form
- Calendar view
- PDF training resources
- Rulebook / mechanics resources
- Officials-only login
- Individual official profiles
- Assignor information
- Meeting minutes
- NCAA / USA Volleyball links
- Search and filter for the roster
- Ability to download the roster
