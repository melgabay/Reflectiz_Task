// liste des sélecteurs que mon script utilisera identique à ceux utilisés dans le script de test pour éviter les erreurs de sélection
// Dans selectors.ts, les clés de gauche (firstName, lastName, etc.) peuvent être propres et lisibles.
// Les vraies valeurs importantes sont celles de droite :
export const selectors = {
personal: {
  title: "#Title",
  firstName: "#FirstName",
  lastName: "#LastName",
  dobDay: "#dob_day",
  dobMonth: "#dob_month",
  dobYear: "#dob_year",
  phone: "#DayTimeTelephone"
},

  addressLookup: {
    houseId: "#houseId",
    postCode: "#postCode",
    findAddressButton: "#searchAddressImageButton"
  },

  account: {
    email: "#Email",
    confirmEmail: "#ConfirmEmail",
    password: "#Password",
    confirmPassword: "#confirmPassword"
  },

  payment: {
    cardHolderName: "#CardHolderName",
    cardNumber: "#CardNumber",
    expiryDateMonthYear: "#ExpiryDateMonthYear",
    cardSecurityCode: "#CardSecurityCode",
    promoEntry: "#promoEntry"
  }
};