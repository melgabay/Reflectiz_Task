# Reflectiz Task 1 - Website Form Automation with Puppeteer, TypeScript, and SQLite

## Project Purpose

This repository contains a TypeScript automation project built with Puppeteer.
The goal of the task is to automate a real e-commerce user flow on the Freemans website, starting from the homepage and continuing up to the purchase stage without completing an actual order.

The script interacts with the website, selects a product, adds it to the bag, proceeds to checkout, creates a user account, fills the required personal and payment details with test data, and stops before any final order submission.

In addition to the browser automation, the task required the use of a local SQLite database to store form-related data such as selectors, properties, and values. The project therefore combines:

- Puppeteer for browser automation
- TypeScript for implementation
- SQLite for structured local storage of form configuration and values
- SQL queries for testing database operations

## Task Requirements

The requested deliverables for the task were the following:

1. Build a Puppeteer automation flow in TypeScript.
2. Use a local SQLite database file.
3. Store selectors, properties, and values in the database.
4. Provide SQL queries to:
   - read all records
   - search specific records
   - update values
   - delete records
5. Add comments to explain the code.
6. Add basic error handling.
7. Include a README with setup and execution instructions.
8. Provide the project in a GitHub repository.
9. Include the local `.sqlite` artifact as part of the project output.

## What Has Been Implemented

This project includes all major building blocks required by the task.

### Browser automation
The script in `src/index.ts` performs the following actions:

1. Opens `https://www.freemans.com`
2. Accepts the cookie banner
3. Navigates to the Women category page
4. Locates a product dynamically using a stable product code
5. If the product is not found on the current listing page, clicks the pagination "next" control and searches again
6. Opens the matched product page
7. Selects a product option and size
8. Adds the product to the bag
9. Checks that the bag count increased
10. Opens the checkout flow
11. Clicks the register option
12. Fills the registration form
13. Searches and selects an address
14. Fills account credentials
15. Clicks the Apply button through the next steps
16. Selects a payment method when needed
17. Fills card details using test data
18. Fills a promo code
19. Unchecks the "Remember Card Details" checkbox if present
20. Stops at the purchase point without submitting an actual order

### SQLite integration
The file `src/database.ts`:

- creates a `database/` folder if it does not already exist
- creates the SQLite database file `database/form_selectors.sqlite`
- creates the `form_data` table if needed
- clears previous inserted rows to avoid duplicates between runs
- seeds the database using data from `src/selectors.ts` and `src/testData.ts`

### SQL query file
The file `sql/queries.sql` contains example queries to:

- retrieve all records
- search by field name and section
- update a stored value
- delete a stored record

### Code comments and error handling
The project includes:

- inline comments that explain the main technical decisions
- helper functions for repeated safe interactions
- timeout handling
- debug screenshot generation when a step fails
- readable error messages with the current failed step

## Technical Design

## 1. Main Files

### `src/index.ts`
This is the main automation entry point.
It initializes the database, loads the stored form data, launches Puppeteer, and performs the website actions step by step.

### `src/database.ts`
This file is responsible for creating and populating the SQLite database.
It also exposes constants such as the database path.

### `src/selectors.ts`
This file centralizes the selectors used by the automation.
It groups them by logical sections:

- personal
- addressLookup
- account
- product
- payment

### `src/testData.ts`
This file stores the test values used to populate the form.
These values are inserted into the SQLite database and can also be used as fallback values when reading from the database.

### `sql/queries.sql`
This file contains SQL queries demonstrating how to inspect and modify the stored form data.

## 2. Database Schema

The SQLite database contains a single table:

```sql
CREATE TABLE IF NOT EXISTS form_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section TEXT NOT NULL,
  field_name TEXT NOT NULL,
  selector TEXT NOT NULL,
  property TEXT NOT NULL,
  value TEXT NOT NULL
)
```

### Column description

- `id`: technical primary key
- `section`: logical group such as `personal` or `payment`
- `field_name`: the field identifier
- `selector`: selector or selector-related reference used by the script
- `property`: stored property information
- `value`: the value associated with the field

## 3. Data Flow

The project works in the following order:

1. `initializeDatabase()` creates and seeds the SQLite database.
2. `getFormDataFromDB()` reads all rows from the `form_data` table.
3. The database rows are transformed into a lookup object.
4. The Puppeteer script uses that lookup object to find selectors and values.
5. If a database value is missing or empty, the script can fall back to the value defined in `testData.ts`.

This architecture makes the script less dependent on hard-coded values directly inside the browser logic.

## 4. Product Selection Strategy

One important issue discovered during implementation is that the website's `data-uniqueid` for a product is not stable.
For example, a product may appear with one value on one day and another on a different day.

To make the automation more robust, the script does not rely only on the full dynamic identifier.
Instead, it extracts and uses the stable `productCode`, which is the part before the underscore, and searches the product list for an item whose `data-uniqueid` starts with that product code.

Example:

- unstable values: `960856_14`, `960856_18`
- stable part used by the script: `960856`

The script first scans the current listing page for a matching product code.
If no matching product card is found, it clicks the pagination "next" control (`span.pagingNextTextContainer` inside its parent link), waits for the next listing page to load, and searches again there.

Once a matching product is found, the script builds the correct clickable selector dynamically from the variant that is currently available on the page.

This was implemented specifically to handle both day-to-day variation in the product identifier and cases where the product is located on the next pagination page instead of the current one.

## Requirements

To run this project locally, the following are required:

- Node.js 18 or newer recommended
- npm installed
- Internet connection
- A local environment capable of launching Chromium through Puppeteer

## Dependencies

The project relies on the following packages:

### Runtime dependencies

- `puppeteer`
- `sqlite3`
- `sqlite`

### Development dependencies

- `typescript`
- `ts-node`
- `@types/node`

Depending on the exact project configuration, these are typically installed with:

```bash
npm install
```

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/melgabay/Reflectiz_Task.git
cd Reflectiz_Task
npm install
```

## How to Run the Project

### Step 1 - Run the automation script

```bash
npm run dev
```

This command should:

1. create the SQLite database if it does not exist
2. seed the database with selectors and test values
3. open the browser in non-headless mode
4. execute the automation flow
5. stop at the purchase point without final submission

### Step 2 - Inspect the SQLite database manually

Open SQLite CLI with:

```bash
sqlite3 database/form_selectors.sqlite
```

Then run the provided query file:

```sql
.read sql/queries.sql
```

## How to Update Stored Values

One goal of the project is to allow values to be updated directly in the database.
For example, to change the first name used by the script:

```sql
UPDATE form_data
SET value = 'Sarah'
WHERE field_name = 'FirstName' AND section = 'personal';
```

After updating the data, the automation can be run again and will use the modified value.

## Error Handling Strategy

Basic error handling has been added to make the flow easier to debug.

### Implemented protections

- `safeWaitAndClick()` retries a click once if the first attempt fails
- `safeType()` wraps typing actions with selector checks and descriptive error messages
- `safeSelect()` wraps dropdown interactions with consistent error handling
- `captureDebugInfo()` saves a screenshot and logs the current URL when a failure occurs
- `getErrorMessage()` normalizes unknown errors into readable messages
- `currentStep` keeps track of the current block so that logs clearly show where the failure happened

### Debug output

If a failure occurs, the script attempts to create a screenshot file named like:

```text
error-Block_7_Register.png
```

This makes it easier to understand whether the issue comes from:

- a changed selector
- a loading delay
- a page transition problem
- a validation message shown by the website

## Assumptions and Notes

Several assumptions were made during implementation:

1. The automation uses test data only.
2. The script is designed for demonstration and technical assessment, not production use.
3. The website structure may change over time, which could require selector updates.
4. The script intentionally stops before placing any real order.
5. The project uses a simple and readable SQLite model rather than a more abstract ORM.
6. The browser runs in visible mode to make the execution easier to inspect.

## Known Limitations

Although the project completes the requested flow, some limitations remain:

1. The website is external and can change at any time.
2. Some selectors are fragile because they depend on the live structure of the target site.
3. Some database entries, especially product-related ones, are used as dynamic matching values rather than direct CSS selectors.
4. The `property` field is currently stored in a simple form and could be modeled more precisely in a future version.
5. The script includes only basic retry logic, not advanced synchronization strategies.
6. Anti-bot protections such as CAPTCHA are not bypassed.
7. The automation is intended for the exact task scope, not as a generic automation framework.

## What Was Specifically Done for the Task

To answer the task requirements concretely:

- A TypeScript project was created.
- Puppeteer was used to automate the requested browser flow.
- SQLite was integrated as a local database layer.
- Selectors and values were stored in SQLite.
- SQL queries were added in a dedicated file.
- The code was commented.
- Error handling was added.
- A dynamic strategy was implemented for unstable product identifiers, including a fallback to the next pagination page when needed.
- A README was written to explain installation, structure, and execution.

## Deliverables Included

The project deliverable includes:

- `src/index.ts`
- `src/database.ts`
- `src/selectors.ts`
- `src/testData.ts`
- `sql/queries.sql`
- `database/form_selectors.sqlite` (generated artifact)
- `README.md`

## Conclusion

This project fulfills the core objective of the task by combining Puppeteer automation with SQLite-backed form configuration in TypeScript.
It demonstrates browser automation, local data persistence, SQL usage, fallback logic, and debugging support in a way that is easy to review and run.