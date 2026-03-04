import puppeteer from "puppeteer";
import { testData } from "./testData";
import { selectors } from "./selectors";
import { setTimeout } from "node:timers/promises";


//This prevents fields from keeping an old value.
async function clearAndType(page: any, selector: string, value: string) {
    await page.waitForSelector(selector, { visible: true, timeout: 5000 });
    await page.click(selector, { clickCount: 3 }); // triple click to select all the text
    await page.keyboard.press("Backspace");
    await page.type(selector, value);
}

async function run() {
    const browser = await puppeteer.launch({ // opens the browser
        headless: false,
        defaultViewport: null
    });

    const page = await browser.newPage(); // creates a new tab

    // 1. Go to the site and wait until the DOM is loaded
    try {
        await page.goto("https://www.freemans.com", {
            waitUntil: "domcontentloaded"
        });

        await setTimeout(3000);  // pause for 3 seconds to make sure the page is fully loaded
        console.log("Block 1 OK: Website opened successfully."); // displays a message in the terminal


        // 2. Click the cookie consent button
        const buttonSelectorConsentCookie = "button.button.primary.at-element-click-tracking"; // selector

        // a) Wait for the button to be present
        await page.waitForSelector(buttonSelectorConsentCookie, {
            visible: true,
            timeout: 3000
        });

        // b) Click the button
        await page.click(buttonSelectorConsentCookie);
        await setTimeout(2000);
        console.log("Block 2 OK: Cookie consent button clicked.");


        // 3. Click the Women link and verify that the URL changed
        const womenLinkSelector = 'a[href="https://www.freemans.com/womens/_/N-1lZ1c?realestate=spotlight&incentive=homepage&intcampaign=spotlight&linkname=womens&location=1"]';

        // a) Wait for the link to be present
        await page.waitForSelector(womenLinkSelector, {
            visible: true,
            timeout: 5000
        });

        // b) Click the link
        await page.click(womenLinkSelector);
        await setTimeout(3000);
        console.log("Block 3 OK: Women link clicked.");


        //4. Choose a product, select the option and the size
        const productSelector = `li[data-uniqueid="${testData.product.dataUniqueid}"] a.img.listItemLink`; // identify the product using its unique data-uniqueid attribute (testData.ts) and class structure 

        await page.waitForSelector(productSelector, {
            visible: true,
            timeout: 5000
        });

        await page.click(productSelector);
        await setTimeout(3000);

        const optionSelector = `.extraOptionContainer .boxOptionOuter[data-optionvalue="${testData.product.option}"]`;
        const sizeSelector = `.option2Container .boxOptionOuter[data-optionvalue="${testData.product.size}"]`;

        await page.waitForSelector(optionSelector, {
            visible: true,
            timeout: 5000
        });
        await page.click(optionSelector);
        await setTimeout(2000);

        await page.waitForSelector(sizeSelector, {
            visible: true,
            timeout: 5000
        });

        await page.click(sizeSelector);
        await setTimeout(2000);
        console.log("Block 4 OK: Product, option and size selected.");


        // 5. Add to bag
        const addToBagSelector = "button.primary.bagButton";
        await page.waitForSelector(addToBagSelector, {
            visible: true,
            timeout: 5000
        });

        await page.click(addToBagSelector);
        await setTimeout(3000);
        console.log("Block 5 OK: Item added to bag.");


        // 6. Click the checkout button
        const checkoutButtonSelector = "#bddCheckout a";
        await page.waitForSelector(checkoutButtonSelector, {
            visible: true,
            timeout: 5000
        });

        await page.click(checkoutButtonSelector);
        await setTimeout(3000);
        console.log("Block 6 OK: Checkout button clicked.");


        //7. Click the register button
        const registerLinkSelector = "#registerLink";

        await page.waitForSelector(registerLinkSelector, {
            visible: true,
            timeout: 5000
        });

        await page.click(registerLinkSelector);
        await setTimeout(3000);
        console.log("Block 7 OK: Register button clicked.");

        //8. Fill in the registration form
        await page.waitForSelector(selectors.personal.firstName, { visible: true, timeout: 5000 }); // proof that we are in the right place

        // Title
        await page.select(selectors.personal.title, testData.personal.title); // "Mrs"

        // First name / Last name
        await page.click(selectors.personal.firstName, { clickCount: 3 });
        await page.type(selectors.personal.firstName, testData.personal.firstName);

        await page.click(selectors.personal.lastName, { clickCount: 3 });
        await page.type(selectors.personal.lastName, testData.personal.lastName);

        // DOB (select)
        await page.select(selectors.personal.dobDay, testData.personal.dob_day);
        await page.select(selectors.personal.dobMonth, testData.personal.dob_month);
        await page.select(selectors.personal.dobYear, testData.personal.dob_year);

        // Phone
        await page.click(selectors.personal.phone, { clickCount: 3 });
        await page.type(selectors.personal.phone, testData.personal.DayTimeTelephone);

        // Fill house number + postcode
        await page.click(selectors.addressLookup.houseId, { clickCount: 3 });
        await page.type(selectors.addressLookup.houseId, testData.addressLookup.houseId);

        await page.click(selectors.addressLookup.postCode, { clickCount: 3 });
        await page.type(selectors.addressLookup.postCode, testData.addressLookup.postCode);

        // 8.b Address
        await page.waitForSelector(selectors.addressLookup.findAddressButton, { visible: true, timeout: 5000 });
        await page.click(selectors.addressLookup.findAddressButton);

        // Wait for the address list to appear
        const addressSelect = "#addressSelect";
        await page.waitForSelector(addressSelect, { visible: true, timeout: 5000 });

        // Get all non-empty option values except the placeholder
        const options = await page.$$eval("#addressSelect option", opts =>
            opts
                .map(o => ({
                    value: (o as HTMLOptionElement).value,
                    text: (o.textContent || "").trim()
                }))
                .filter(o =>
                    o.value &&
                    o.value.trim() !== "" &&
                    !o.text.toLowerCase().includes("please select") // exclude placeholder options that invite the user to select an address
                )
        );

        // Select the first real address
        if (options.length > 0) {
            await page.select(addressSelect, options[0].value);
            await setTimeout(2000);
            console.log("Block 8.b OK: Address selected from the list.");}

        await page.waitForSelector(selectors.account.email, { visible: true, timeout: 5000 });

        await page.click(selectors.account.email, { clickCount: 3 });
        await page.type(selectors.account.email, testData.account.Email);

        await page.click(selectors.account.confirmEmail, { clickCount: 3 });
        await page.type(selectors.account.confirmEmail, testData.account.ConfirmEmail);

        await page.click(selectors.account.password, { clickCount: 3 });
        await page.type(selectors.account.password, testData.account.Password);

        await page.click(selectors.account.confirmPassword, { clickCount: 3 });
        await page.type(selectors.account.confirmPassword, testData.account.confirmPassword);

        console.log("Block 8 OK: Information filled.");


        //9. Click the Apply button to go to the payment step (same button appears on 2 consecutive pages, we click it twice)
        const applyButton = "#applybutton";

        // Apply step 1
        await page.waitForSelector(applyButton, { visible: true, timeout: 5000 });
        await page.click(applyButton);
        await setTimeout(3000);

        // Apply step 2 (same id on next page)
        await page.waitForSelector(applyButton, { visible: true, timeout: 5000 });
        await page.click(applyButton);
        await setTimeout(3000);
        console.log("Block 9 OK: Apply button clicked twice.");


        // 10. Choose the payment method
        const cashPaymentChoiceSelector = "#cashPaymentChoice";
        const cashPaymentChoiceAppeared = await page.waitForSelector(cashPaymentChoiceSelector, {
            timeout: 5000
        })
            .then(() => true)
            .catch(() => false);

        if (cashPaymentChoiceAppeared) {
            // Some radio buttons exist but are not considered visible by Puppeteer.
            // We check it directly through the DOM.
            await page.$eval(cashPaymentChoiceSelector, el => {
                const input = el as HTMLInputElement;
                input.checked = true;
                input.dispatchEvent(new Event("click", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
            });

            await setTimeout(2000);
        } else {
            console.log("cashPaymentChoice not found in the DOM: we are probably not yet on the correct payment step.");
        }

        // Wait for the card details block to be displayed
        await page.waitForSelector("#enterCardDetails", { visible: true, timeout: 5000 });

        await clearAndType(page, selectors.payment.cardHolderName, testData.payment.CardHolderName);
        await clearAndType(page, selectors.payment.cardNumber, testData.payment.CardNumber);
        await clearAndType(page, selectors.payment.expiryDateMonthYear, testData.payment.ExpiryDateMonthYear);
        await clearAndType(page, selectors.payment.cardSecurityCode, testData.payment.CardSecurityCode);

        console.log("Block 10 OK: Payment information filled.");

        // 11. Fill in promo code and uncheck "Remember Card Details"
        await clearAndType(page, selectors.payment.promoEntry, testData.payment.promoEntry);

        const rememberSelector = "#RememberCardDetails";
        const rememberHandle = await page.$(rememberSelector);

        if (rememberHandle) {
            const isChecked = await page.$eval(rememberSelector, el => {
                return (el as HTMLInputElement).checked;
            });

            if (isChecked) {
                await page.click(rememberSelector);
            }
        }
            console.log("Block 11 OK: Promo code filled and 'Remember Card Details' unchecked.");


        console.log("STOP: Form filled up to the purchase point. First step of the task completed successfully.");
        await setTimeout(10000);

        browser.close()

    } catch (error) {
        console.error("Error during the test:", error);
    }
}

run();