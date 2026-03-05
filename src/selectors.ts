// List of selectors used by the script.
// They are kept aligned with the selectors from the test script to avoid selection mismatches.
// In `selectors.ts`, the keys on the left (`firstName`, `lastName`, etc.) are readable labels,
// while the values on the right are the actual CSS selectors used by Puppeteer.
export const selectors = {
  personal: {
    Title: "#Title",
    FirstName: "#FirstName",
    LastName: "#LastName",
    dob_day: "#dob_day",
    dob_month: "#dob_month",
    dob_year: "#dob_year",
    DayTimeTelephone: "#DayTimeTelephone"
  },

  addressLookup: {
    houseId: "#houseId",
    postCode: "#postCode",
    searchAddressImageButton: "#searchAddressImageButton"
  },

  account: {
    Email: "#Email",
    ConfirmEmail: "#ConfirmEmail",
    Password: "#Password",
    confirmPassword: "#confirmPassword"
  },

  product: {
    productCode: "productCode",
    dataUniqueid: "data-uniqueid",
    option: "data-optionvalue-option",
    size: "data-optionvalue-size",
    dataMasteritem: "data-masteritem"
  },

  payment: {
    cardHolderName: "#CardHolderName",
    cardNumber: "#CardNumber",
    expiryDateMonthYear: "#ExpiryDateMonthYear",
    cardSecurityCode: "#CardSecurityCode",
    promoEntry: "#promoEntry"
  }
};