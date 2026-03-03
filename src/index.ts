import puppeteer from "puppeteer";

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
  });

  const page = await browser.newPage();

  await page.goto("https://example.com");

  console.log("Le navigateur s'est bien ouvert et la page a été chargée.");

  await browser.close();
}

run().catch((error) => {
  console.error("Erreur :", error);
});