import puppeteer from "puppeteer";
import { testData } from "./testData";
import { selectors } from "./selectors";
import { setTimeout } from "node:timers/promises";

async function run() {
    const browser = await puppeteer.launch({ // → ouvre le navigateur
        headless: false,
        defaultViewport: null
    });

    const page = await browser.newPage(); // crée un onglet

    // 1. va sur le site et attend que le DOM soit chargé
    try {
        await page.goto("https://www.freemans.com", {
            waitUntil: "domcontentloaded"
        });

        // Pause de 3 secondes
        await setTimeout(3000); //  attend 3 secondes pour s'assurer que la page est complètement chargée
        console.log("Site ouvert avec succès"); //  affiche un message dans le terminal

        // 2. Cliquer sur le bouton de consentement des cookies
        // Sélecteur du bouton de consentement des cookies (à adapter selon le site)
        const buttonSelectorConsentCookie = "button.button.primary.at-element-click-tracking";

        // a) Attendre que le bouton soit présent

        await page.waitForSelector(buttonSelectorConsentCookie, {
            visible: true,
            timeout: 3000
        });
        console.log("Button found. Clicking it...");

        // b) Cliquer sur le bouton
        await page.click(buttonSelectorConsentCookie);
        console.log("Button clicked.");

        await setTimeout(2000);


        // 3. Clique sur le lien Women et vérifie que l'URL a changé
        // Sélecteur
        const womenLinkSelector =
            'a[href="https://www.freemans.com/womens/_/N-1lZ1c?realestate=spotlight&incentive=homepage&intcampaign=spotlight&linkname=womens&location=1"]';


        // a) Attendre que le lien soit présent
        await page.waitForSelector(womenLinkSelector, {
            visible: true,
            timeout: 5000
        });
        console.log("Lien Women trouvé. Clic...");

        // b) Cliquer sur le lien
        await page.click(womenLinkSelector);

        await setTimeout(3000);

        console.log("URL après clic Women :", page.url());

        //4. Choisir un article, sélectionner l'option et la taille
        const productSelector = `li[data-uniqueid="${testData.product.dataUniqueid}"] a.img.listItemLink`;

        await page.waitForSelector(productSelector, {
            visible: true,
            timeout: 10000
        });

        console.log("Produit trouvé. Clic...");
        await page.click(productSelector);
        await setTimeout(3000);

        console.log("URL après clic article :", page.url());

        const optionSelector = `.extraOptionContainer .boxOptionOuter[data-optionvalue="${testData.product.option}"]`;
        const sizeSelector = `.option2Container .boxOptionOuter[data-optionvalue="${testData.product.size}"]`;

        await page.waitForSelector(optionSelector, {
            visible: true,
            timeout: 10000
        });
        console.log("Option trouvée :", testData.product.option);
        await page.click(optionSelector);
        await setTimeout(2000);

        await page.waitForSelector(sizeSelector, {
            visible: true,
            timeout: 10000
        });
        console.log("Taille trouvée :", testData.product.size);
        await page.click(sizeSelector);
        await setTimeout(2000);

        // 5. Ajouter au panier
        const addToBagSelector = "button.primary.bagButton";
        await page.waitForSelector(addToBagSelector, {
            visible: true,
            timeout: 10000
        });


        console.log("Bouton Add to Bag trouvé. Clic...");
        await page.click(addToBagSelector);
        await setTimeout(3000);

        console.log("Article ajouté au panier.");

        // 6. Cliquer sur le bouton de checkout
        const checkoutButtonSelector = "#bddCheckout a";
        await page.waitForSelector(checkoutButtonSelector, {
            visible: true,
            timeout: 10000
        });
        console.log("Bouton Checkout trouvé. Clic...");
        await page.click(checkoutButtonSelector);
        await setTimeout(3000);
        console.log("URL après clic checkout :", page.url());

        //7. Cliquer sur le bouton de s'inscrire
        const registerLinkSelector = "#registerLink";

        await page.waitForSelector(registerLinkSelector, {
            visible: true,
            timeout: 10000
        });

        console.log("Bouton register trouvé. Clic...");
        await page.click(registerLinkSelector);
        await setTimeout(3000);

        console.log("URL après clic register :", page.url());
        // preuve que tu es au bon endroit
        await page.waitForSelector(selectors.personal.firstName, { visible: true, timeout: 10000 });
        console.log("Formulaire d'inscription chargé (FirstName visible).");
        //8. Remplir le formulaire d'inscription
        // Title
        await page.waitForSelector(selectors.personal.title, { visible: true, timeout: 10000 });
        await page.select(selectors.personal.title, testData.personal.title); // "Mrs"

        // Prénom / Nom
        await page.click(selectors.personal.firstName, { clickCount: 3 });
        await page.type(selectors.personal.firstName, testData.personal.firstName);

        await page.click(selectors.personal.lastName, { clickCount: 3 });
        await page.type(selectors.personal.lastName, testData.personal.lastName);

        // DOB (select)
        await page.select(selectors.personal.dobDay, testData.personal.dob_day);     // "12"
        await page.select(selectors.personal.dobMonth, testData.personal.dob_month); // "05"
        await page.select(selectors.personal.dobYear, testData.personal.dob_year);   // "1998"

        // Téléphone
        await page.click(selectors.personal.phone, { clickCount: 3 });
        await page.type(selectors.personal.phone, testData.personal.DayTimeTelephone);

        console.log("Bloc 2 OK: identité + DOB + téléphone remplis.");

        // Remplir house + postcode
        await page.click(selectors.addressLookup.houseId, { clickCount: 3 });
        await page.type(selectors.addressLookup.houseId, testData.addressLookup.houseId);

        await page.click(selectors.addressLookup.postCode, { clickCount: 3 });
        await page.type(selectors.addressLookup.postCode, testData.addressLookup.postCode);

        // Cliquer Find Address
        await page.waitForSelector(selectors.addressLookup.findAddressButton, { visible: true, timeout: 10000 });
        await page.click(selectors.addressLookup.findAddressButton);

        console.log("Find Address cliqué, attente résultat...");


        const addressSelect = "#addressSelect";

        const addressSelectAppeared = await page.waitForSelector(addressSelect, { visible: true, timeout: 10000 })
            .then(() => true)
            .catch(() => false);

        if (addressSelectAppeared) {
            // récupère les valeurs d'options non vides
            const options = await page.$$eval("#addressSelect option", opts =>
                opts.map(o => (o as HTMLOptionElement).value).filter(v => v && v.trim() !== "")
            );

            console.log("Options d'adresse trouvées :", options.slice(0, 3));

            if (options.length > 0) {
                await page.select("#addressSelect", options[0]); // déclenche onchange => confirme l'adresse
                await setTimeout(2000);
                console.log("Adresse sélectionnée.");
            }
        }

        const manualSection = "#addressInputAllSection";

        const manualAppeared = await page.waitForSelector(manualSection, { visible: true, timeout: 3000 })
            .then(() => true)
            .catch(() => false);

        if (manualAppeared) {
            console.log("Mode manuel activé (postcode non trouvé).");

            await page.click("#address_1", { clickCount: 3 });
            await page.type("#address_1", testData.manualAddress.address1);

            await page.click("#address_2", { clickCount: 3 });
            await page.type("#address_2", testData.manualAddress.address2);

            await page.click("#city", { clickCount: 3 });
            await page.type("#city", testData.manualAddress.city);

            await page.click("#county", { clickCount: 3 });
            await page.type("#county", testData.manualAddress.county);

            await page.click("#post_code", { clickCount: 3 });
            await page.type("#post_code", testData.manualAddress.postCode);

            console.log("Adresse manuelle remplie.");
        }

        const confirmedSection = "#addressDetailsSection";
        const confirmed = await page.waitForSelector(confirmedSection, { visible: true, timeout: 10000 })
            .then(() => true)
            .catch(() => false);

        if (confirmed) console.log("Adresse confirmée affichée.");

        await page.waitForSelector(selectors.account.email, { visible: true, timeout: 10000 });

await page.click(selectors.account.email, { clickCount: 3 });
await page.type(selectors.account.email, testData.account.Email);

await page.click(selectors.account.confirmEmail, { clickCount: 3 });
await page.type(selectors.account.confirmEmail, testData.account.ConfirmEmail);

await page.click(selectors.account.password, { clickCount: 3 });
await page.type(selectors.account.password, testData.account.Password);

await page.click(selectors.account.confirmPassword, { clickCount: 3 });
await page.type(selectors.account.confirmPassword, testData.account.confirmPassword);

console.log("Bloc 5 OK: compte rempli.");

//Continue filling payment details if needed...
const applyButton = "#applybutton";

await page.waitForSelector(applyButton, { visible: true, timeout: 10000 });
await page.click(applyButton);
await setTimeout(3000);

console.log("Après 1er apply, URL =", page.url());

const visibleErrorsAfterFirstApply = await page.$$eval(".error", elements =>
  elements
    .map(el => ({
      text: (el.textContent || "").trim(),
      display: window.getComputedStyle(el).display
    }))
    .filter(e => e.display !== "none" && e.text.length > 0)
);

console.log("Erreurs après 1er apply :", visibleErrorsAfterFirstApply);

const pageContentAfterFirstApply = await page.content();
console.log("La page contient cashPaymentChoice ?", pageContentAfterFirstApply.includes("cashPaymentChoice"));

//another bouton à cliquer pour continuer
const secondApplyAppeared = await page.waitForSelector(applyButton, { visible: true, timeout: 3000 })
  .then(() => true)
  .catch(() => false);

if (secondApplyAppeared) {
  await page.click(applyButton);
  await setTimeout(3000);

  console.log("Après 2e apply, URL =", page.url());

  const visibleErrorsAfterSecondApply = await page.$$eval(".error", elements =>
    elements
      .map(el => ({
        text: (el.textContent || "").trim(),
        display: window.getComputedStyle(el).display
      }))
      .filter(e => e.display !== "none" && e.text.length > 0)
  );

  console.log("Erreurs après 2e apply :", visibleErrorsAfterSecondApply);

  const pageContentAfterSecondApply = await page.content();
  console.log("La page contient cashPaymentChoice après 2e apply ?", pageContentAfterSecondApply.includes("cashPaymentChoice"));
}

// 9. Choisir le moyen de paiement
const cashPaymentChoiceSelector = "#cashPaymentChoice";
const cashPaymentChoiceAppeared = await page.waitForSelector(cashPaymentChoiceSelector, {
  timeout: 5000
})
  .then(() => true)
  .catch(() => false);

if (cashPaymentChoiceAppeared) {
  console.log("cashPaymentChoice trouvé dans le DOM.");

  // Certains radios existent mais ne sont pas considérés comme visibles par Puppeteer.
  // On le coche directement via le DOM.
  await page.$eval(cashPaymentChoiceSelector, el => {
    const input = el as HTMLInputElement;
    input.checked = true;
    input.dispatchEvent(new Event("click", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  await setTimeout(2000);
  console.log("Option de paiement cash sélectionnée. URL =", page.url());
} else {
  console.log("cashPaymentChoice non trouvé dans le DOM : on n'est probablement pas encore sur la bonne étape de paiement.");
}
} catch (error) {
        console.error("Erreur pendant le test :", error);
    }
}

run();