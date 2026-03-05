import puppeteer, { Browser, Page, TimeoutError } from "puppeteer";
import { testData } from "./testData";
import { setTimeout } from "node:timers/promises";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { initializeDatabase, deleteDatabaseFile, DB_PATH } from "./database";
// Database setup + helpers
// We store selectors + test values in SQLite so the script can be driven by DB data instead of hard-coded constants.
async function getFormDataFromDB() {
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    
    // Pull field name + CSS selector + stored value (if any)
    const rows = await db.all("SELECT field_name, selector, value FROM form_data");
    await db.close();
    
    // Convert DB rows into a convenient lookup object:
    // formData[fieldName] => { selector, value }
    const data: any = {};
    rows.forEach(row => {
        data[row.field_name] = { selector: row.selector, value: row.value };
    });
    return data;
}

// Error handling helpers (keeps the main flow readable)
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

// Read a field value from DB formData; if missing/blank, use the provided fallback.
// This allows the DB to override `testData` without breaking the flow when DB is incomplete.
function dbValue(formData: any, fieldName: string, fallback?: string) {
  const v = formData?.[fieldName]?.value;
  return (v !== undefined && v !== null && String(v).trim() !== "") ? String(v) : (fallback ?? "");
}

async function captureDebugInfo(page: Page, stepName: string) {
    try {
        const safeStep = stepName.replace(/[^\w-]+/g, "_");
        await page.screenshot({
            path: `error-${safeStep}.png`,
            fullPage: true
        });
        console.log(`Debug screenshot saved: error-${safeStep}.png`);
        console.log(`Current URL: ${page.url()}`);
    } catch (e) {
        console.error("Failed to capture debug info:", getErrorMessage(e));
    }
}

// Improved helpers 

/**
 * Clicks an element with a single retry if the first attempt fails.
 * Also tries to detect a visible UI error message after the click.
 *
 * Why: on real sites, elements can be attached but not yet clickable (animations, overlays, slow rendering).
 */
async function safeWaitAndClick(page: Page, selector: string, stepLabel: string, timeout = 5000) {
    const clickAction = async () => {
        await page.waitForSelector(selector, { visible: true, timeout });
        await page.click(selector);
    };

    try {
        // Attempt 1
        await clickAction();
    } catch (e) {
        // Attempt 2 (retry): wait 500ms and try once more
        console.log(`Minor issue on ${stepLabel}, retrying once...`);
        await setTimeout(500);
        try {
            await clickAction();
        } catch (finalError) {
            throw new Error(`${stepLabel} failed after 2 attempts (Selector: ${selector})`);
        }
    }

    // Site error inspection 
    try {
        const siteErrorMessage = await page.evaluate(() => {
            const errorEl = document.querySelector('.error, .errorMessage, .validation-error, .error-msg');
            return errorEl ? errorEl.textContent?.trim() : null;
        });

        if (siteErrorMessage) {
            console.log(`UI error message detected after ${stepLabel}: "${siteErrorMessage}"`);
        }
    } catch {
        // If the click triggered a navigation/reload, the execution context can be destroyed.
        // We don't want to fail the whole script just because we couldn't read a UI error message.
        console.log(`Could not read a UI error message after ${stepLabel}: navigation/reload in progress.`);
    }
}

/**
 * Selects an option in a dropdown with consistent error handling.
 */
async function safeSelect(page: Page, selector: string, value: string, stepLabel: string, timeout = 5000) {
    try {
        await page.waitForSelector(selector, { visible: true, timeout });
        await page.select(selector, value);
    } catch (e) {
        throw new Error(`${stepLabel} (Select) failed: ${getErrorMessage(e)}`);
    }
}
async function safeType(page: Page, selector: string, value: string, stepLabel: string, timeout = 5000) {
    try {
        await page.waitForSelector(selector, { visible: true, timeout });
        await page.click(selector, { clickCount: 3 });
        await page.keyboard.press("Backspace");
        await page.type(selector, value);
    } catch (e) {
        throw new Error(`${stepLabel} (Type) failed: ${getErrorMessage(e)}`);
    }
}


async function run() {
    let browser: Browser | null = null;
    let page: Page | null = null;
    let currentStep = "Init";

    await initializeDatabase();

    // Load selectors + optional override values from the DB.
    // If a value is present in DB it wins; otherwise we fall back to `testData`.
    const formData = await getFormDataFromDB();

    browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null
    });

    page = await browser.newPage(); // creates a new tab
    page.setDefaultTimeout(5000);


    // 1. Go to the site and wait until the DOM is loaded
    try {
        currentStep = "Block 1: Go to freemans.com";
        await page!.goto("https://www.freemans.com", {
            waitUntil: "domcontentloaded"
        });

        await setTimeout(3000);
        console.log("Block 1 OK: Website opened successfully.");


        // 2. Click the cookie consent button
        const buttonSelectorConsentCookieSelector = "button.button.primary.at-element-click-tracking";

        currentStep = "Block 2: Cookie consent";
        await safeWaitAndClick(page!, buttonSelectorConsentCookieSelector, "Block 2: Cookie consent", 3000);
        await setTimeout(2000);
        console.log("Block 2 OK: Cookie consent button clicked.");


        // 3. Click the Women link and verify that the URL changed accordingly
        const womenLinkSelector = 'a[href="https://www.freemans.com/womens/_/N-1lZ1c?realestate=spotlight&incentive=homepage&intcampaign=spotlight&linkname=womens&location=1"]';

        currentStep = "Block 3: Women link";
        await safeWaitAndClick(page!, womenLinkSelector, "Block 3: Women link");
        await setTimeout(3000);
        console.log("Block 3 OK: Women link clicked.");


        // 4. Choose a product, then select option + size
        // data-uniqueid is not stable between days (e.g. 960856_14 vs 960856_18).
        // We match using the stable product code (960856) and then click the card link for the first matching variant.
        const rawProductId = dbValue(formData, "dataUniqueid", testData.product.dataUniqueid);
        const productCode = dbValue(formData, "productCode", rawProductId.split("_")[0]);

        // `rawProductId` can change, but `productCode` (before the underscore) stays stable.
        // Example: rawProductId = "960856_18" => productCode = "960856".

        // Wait until product cards are present on the listing page (so $$eval can iterate reliably)
        await page!.waitForSelector('li[data-uniqueid] a.img.listItemLink', { visible: true, timeout: 5000 });

        // Find the first data-uniqueid that matches the stable product code (e.g. 960856_*)
        const foundUniqueId = await page!.$$eval(
            'li[data-uniqueid]',
            (items, code) => {
                for (const li of items) {
                    const id = li.getAttribute('data-uniqueid') || '';
                    if (id.startsWith(String(code) + '_')) return id;
                }
                return null;
            },
            productCode
        );

        if (!foundUniqueId) {
            throw new Error(`Block 4 failed: no product card found with code ${productCode} (expected data-uniqueid like ${productCode}_*)`);
        }

        // Click the product card using the variant-specific unique id we just discovered.
        const productSelector = `li[data-uniqueid="${foundUniqueId}"] a.img.listItemLink`;

        currentStep = "Block 4: Product click";
        await safeWaitAndClick(page!, productSelector, "Block 4: Product click");
        await setTimeout(3000);

        const optionSelector = `.extraOptionContainer .boxOptionOuter[data-optionvalue="${dbValue(formData, "option", testData.product.option)}"]`;
        const sizeSelector = `.option2Container .boxOptionOuter[data-optionvalue="${dbValue(formData, "size", testData.product.size)}"]`;

        await page!.waitForSelector(optionSelector, {
            visible: true,
            timeout: 5000
        });
        await page!.click(optionSelector);
        await setTimeout(2000);

        await page!.waitForSelector(sizeSelector, {
            visible: true,
            timeout: 5000
        });

        await page!.click(sizeSelector);
        await setTimeout(2000);
        console.log("Block 4 OK: Product, option and size selected.");


        // 5. Add to bag and verify that the bag count increased
        const addToBagSelector = "button.primary.bagButton";
        const bagCountSelector = "#xfoBagCount";

        const countBefore = await page!.evaluate((selector) => {
            const el = document.querySelector(selector);
            const text = el?.textContent?.trim() || "0";
            const parsed = parseInt(text, 10);
            return Number.isNaN(parsed) ? 0 : parsed;
        }, bagCountSelector);

        currentStep = "Block 5: Add to bag";
        await safeWaitAndClick(page!, addToBagSelector, "Block 5: Add to bag");

        try {
            await page!.waitForFunction(
                (selector, previousCount) => {
                    const el = document.querySelector(selector);
                    const text = el?.textContent?.trim() || "0";
                    const parsed = parseInt(text, 10);
                    const currentCount = Number.isNaN(parsed) ? 0 : parsed;
                    return currentCount > previousCount;
                },
                { timeout: 5000 },
                bagCountSelector,
                countBefore
            );

            const countAfter = await page!.evaluate((selector) => {
                const el = document.querySelector(selector);
                const text = el?.textContent?.trim() || "0";
                const parsed = parseInt(text, 10);
                return Number.isNaN(parsed) ? 0 : parsed;
            }, bagCountSelector);

            console.log(`Block 5 OK: Item added to bag. Count before = ${countBefore}, count after = ${countAfter}`);
        } catch (e) {
            throw new Error(`Block 5 failed: add-to-bag click happened but #xfoBagCount did not update. ${getErrorMessage(e)}`);
        }

        // 6. Click the checkout button
        const checkoutButtonSelector = "#bddCheckout a";
        currentStep = "Block 6: Checkout";
        await safeWaitAndClick(page!, checkoutButtonSelector, "Block 6: Checkout");
        await setTimeout(3000);
        console.log("Block 6 OK: Checkout button clicked.");


        //7. Click the register button
        const registerLinkSelector = "#registerLink";

        currentStep = "Block 7: Register";
        await safeWaitAndClick(page!, registerLinkSelector, "Block 7: Register");
        await setTimeout(3000);
        console.log("Block 7 OK: Register button clicked.");

        //8. Fill in the registration form
        currentStep = "Block 8: Fill registration form";
        await page!.waitForSelector(formData.FirstName.selector, { visible: true, timeout: 5000 });

        // Title
        await safeSelect(page!, formData.Title.selector, dbValue(formData, "Title", testData.personal.Title), "Block 8: Title");

        // First name / Last name
        await safeType(page!, formData.FirstName.selector, dbValue(formData, "FirstName", testData.personal.FirstName), "Block 8: First name");
        await safeType(page!, formData.LastName.selector, dbValue(formData, "LastName", testData.personal.LastName), "Block 8: Last name");

        // DOB (select)
        await safeSelect(page!, formData.dob_day.selector, dbValue(formData, "dob_day", testData.personal.dob_day), "Block 8: DOB day");
        await safeSelect(page!, formData.dob_month.selector, dbValue(formData, "dob_month", testData.personal.dob_month), "Block 8: DOB month");
        await safeSelect(page!, formData.dob_year.selector, dbValue(formData, "dob_year", testData.personal.dob_year), "Block 8: DOB year");

        // Phone
        await safeType(page!, formData.DayTimeTelephone.selector, dbValue(formData, "DayTimeTelephone", testData.personal.DayTimeTelephone), "Block 8: Phone");

        // Fill house number + postcode
        await safeType(page!, formData.houseId.selector, dbValue(formData, "houseId", testData.addressLookup.houseId), "Block 8: House number");

        await safeType(page!, formData.postCode.selector, dbValue(formData, "postCode", testData.addressLookup.postCode), "Block 8: Postcode");

        // 8.b Address
        await page!.waitForSelector(formData.searchAddressImageButton.selector, { visible: true, timeout: 5000 });
        await page!.click(formData.searchAddressImageButton.selector);

        const addressSelector = "#addressSelect";
        await page!.waitForSelector(addressSelector, { visible: true, timeout: 5000 });

        const options = await page!.$$eval("#addressSelect option", opts =>
            opts
                .map(o => ({
                    value: (o as HTMLOptionElement).value,
                    text: (o.textContent || "").trim()
                }))
                .filter(o =>
                    o.value &&
                    o.value.trim() !== "" &&
                    !o.text.toLowerCase().includes("please select")
                )
        );

        if (options.length > 0) {
            await page!.select(addressSelector, options[0].value);
            await setTimeout(2000);
            console.log("Block 8.b OK: Address selected from the list.");
        }

        await page!.waitForSelector(formData.Email.selector, { visible: true, timeout: 5000 });
        await safeType(page!, formData.Email.selector, dbValue(formData, "Email", testData.account.Email), "Block 8: Email");
        await safeType(page!, formData.ConfirmEmail.selector, dbValue(formData, "ConfirmEmail", testData.account.ConfirmEmail), "Block 8: Confirm Email");
        await safeType(page!, formData.Password.selector, dbValue(formData, "Password", testData.account.Password), "Block 8: Password");
        await safeType(page!, formData.confirmPassword.selector, dbValue(formData, "confirmPassword", testData.account.confirmPassword), "Block 8: Confirm Password");

        console.log("Block 8 OK: Information filled.");


        // 9. Click the Apply button to reach the payment step.
        // The site reuses the same #applybutton on two consecutive pages, so we click it twice.

        const applyButtonSelector = "#applybutton";
        
        // Apply step 1
        currentStep = "Block 9: Apply step 1";
        await safeWaitAndClick(page!, applyButtonSelector, "Block 9: Apply step 1");
        await setTimeout(3000);

        // Apply step 2 (same id on next page)
        currentStep = "Block 9: Apply step 2";
        await safeWaitAndClick(page!, applyButtonSelector, "Block 9: Apply step 2");
        await setTimeout(3000);
        console.log("Block 9 OK: Apply button clicked twice.");


        // 10. Choose the payment method
        currentStep = "Block 10: Payment method";
        const cashPaymentChoiceSelector = "#cashPaymentChoice";
        const cashPaymentChoiceAppeared = await page!.waitForSelector(cashPaymentChoiceSelector, {
            timeout: 5000
        })
            .then(() => true)
            .catch(() => false);

        if (cashPaymentChoiceAppeared) {
            await page!.$eval(cashPaymentChoiceSelector, el => {
                const input = el as HTMLInputElement;
                input.checked = true;
                input.dispatchEvent(new Event("click", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
            });

            await setTimeout(2000);
        } else {
            console.log("cashPaymentChoice not found in the DOM (probably not on the expected payment step yet)");
        }

        // Wait for the card details block to be displayed
        currentStep = "Block 10: Fill card details";
        await page!.waitForSelector("#enterCardDetails", { visible: true, timeout: 5000 });

        await safeType(page!, formData.cardHolderName.selector, dbValue(formData, "cardHolderName", testData.payment.cardHolderName), "Block 10: Card holder name");
        await safeType(page!, formData.cardNumber.selector, dbValue(formData, "cardNumber", testData.payment.cardNumber), "Block 10: Card number");
        await safeType(page!, formData.expiryDateMonthYear.selector, dbValue(formData, "expiryDateMonthYear", testData.payment.expiryDateMonthYear), "Block 10: Expiry date");
        await safeType(page!, formData.cardSecurityCode.selector, dbValue(formData, "cardSecurityCode", testData.payment.cardSecurityCode), "Block 10: Security code");

        console.log("Block 10 OK: Payment information filled.");


        // 11. Fill in promo code and uncheck "Remember Card Details"
        currentStep = "Block 11: Promo code";
        await safeType(page!, formData.promoEntry.selector, dbValue(formData, "promoEntry", testData.payment.promoEntry), "Block 11: Promo code");
        const rememberSelector = "#RememberCardDetails";
        const rememberHandle = await page!.$(rememberSelector);

        if (rememberHandle) {
            const isChecked = await page!.$eval(rememberSelector, el => {
                return (el as HTMLInputElement).checked;
            });

            if (isChecked) {
                await page!.click(rememberSelector);
            }
        }
        console.log("Block 11 OK: Promo code filled and 'Remember Card Details' unchecked.");

        console.log("STOP: Form filled up to the purchase point. First step of the task completed successfully.");
        await setTimeout(10000);

    } catch (error) {
        console.error(`Error during the test at step: ${currentStep}`);

        if (error instanceof TimeoutError) {
            console.error("TimeoutError:", error.message);
        } else {
            console.error("Unexpected error:", getErrorMessage(error));
        }

        if (page) {
            await captureDebugInfo(page, currentStep);
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

run();
