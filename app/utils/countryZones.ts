export const countryZoneList = {
  "Asia": {
    "East Asia": [
      "China",
      "Hong Kong",
      "Japan",
      "Macau",
      "Mongolia",
      "South Korea",
      "Taiwan"
    ],
    "Southeast Asia": [
      "Brunei",
      "Cambodia",
      "Indonesia",
      "Laos",
      "Malaysia",
      "Myanmar",
      "Philippines",
      "Singapore",
      "Thailand",
      "Timor-Leste",
      "Vietnam"
    ],
    "South Asia": [
      "Afghanistan",
      "Bangladesh",
      "Bhutan",
      "India",
      "Maldives",
      "Nepal",
      "Pakistan",
      "Sri Lanka"
    ],
    "Central Asia": [
      "Kazakhstan",
      "Kyrgyzstan",
      "Tajikistan",
      "Turkmenistan",
      "Uzbekistan"
    ],
    "Western Asia (Middle East)": [
      "Armenia",
      "Azerbaijan",
      "Bahrain",
      "Cyprus",
      "Georgia",
      "Iran",
      "Iraq",
      "Israel",
      "Jordan",
      "Kuwait",
      "Lebanon",
      "Oman",
      "Qatar",
      "Saudi Arabia",
      "Syria",
      "Turkey",
      "United Arab Emirates",
      "Yemen"
    ]
  },
  "Europe": {
    "Western Europe": [
      "Austria",
      "Belgium",
      "France",
      "Germany",
      "Liechtenstein",
      "Luxembourg",
      "Monaco",
      "Netherlands",
      "Switzerland"
    ],
    "Northern Europe": [
      "Denmark",
      "Estonia",
      "Finland",
      "Iceland",
      "Ireland",
      "Latvia",
      "Lithuania",
      "Norway",
      "Sweden",
      "United Kingdom"
    ],
    "Southern Europe": [
      "Albania",
      "Andorra",
      "Bosnia and Herzegovina",
      "Croatia",
      "Greece",
      "Italy",
      "Malta",
      "Montenegro",
      "North Macedonia",
      "Portugal",
      "San Marino",
      "Serbia",
      "Slovenia",
      "Spain",
      "Vatican City"
    ],
    "Eastern Europe": [
      "Belarus",
      "Bulgaria",
      "Czechia",
      "Hungary",
      "Moldova",
      "Poland",
      "Romania",
      "Russia",
      "Slovakia",
      "Ukraine"
    ]
  },
  "Africa": {
    "North Africa": [
      "Algeria",
      "Egypt",
      "Libya",
      "Morocco",
      "Sudan",
      "Tunisia"
    ],
    "Sub-Saharan Africa": [
      "Angola",
      "Benin",
      "Botswana",
      "Burkina Faso",
      "Burundi",
      "Cabo Verde",
      "Cameroon",
      "Central African Republic",
      "Chad",
      "Comoros",
      "Congo",
      "Democratic Republic of the Congo",
      "Djibouti",
      "Equatorial Guinea",
      "Eritrea",
      "Eswatini",
      "Ethiopia",
      "Gabon",
      "Gambia",
      "Ghana",
      "Guinea",
      "Guinea-Bissau",
      "Ivory Coast",
      "Kenya",
      "Lesotho",
      "Liberia",
      "Madagascar",
      "Malawi",
      "Mali",
      "Mauritania",
      "Mauritius",
      "Mozambique",
      "Namibia",
      "Niger",
      "Nigeria",
      "Rwanda",
      "Sao Tome and Principe",
      "Senegal",
      "Seychelles",
      "Sierra Leone",
      "Somalia",
      "South Africa",
      "South Sudan",
      "Tanzania",
      "Togo",
      "Uganda",
      "Zambia",
      "Zimbabwe"
    ]
  },
  "North America": {
    "North America": [
      "Canada",
      "United States",
      "Mexico"
    ],
    "Central America & Caribbean": [
      "Antigua and Barbuda",
      "Bahamas",
      "Barbados",
      "Belize",
      "Costa Rica",
      "Cuba",
      "Dominica",
      "Dominican Republic",
      "El Salvador",
      "Grenada",
      "Guatemala",
      "Haiti",
      "Honduras",
      "Jamaica",
      "Nicaragua",
      "Panama",
      "Saint Kitts and Nevis",
      "Saint Lucia",
      "Saint Vincent and the Grenadines",
      "Trinidad and Tobago"
    ]
  },
  "South America": {
    "South America": [
      "Argentina",
      "Bolivia",
      "Brazil",
      "Chile",
      "Colombia",
      "Ecuador",
      "Guyana",
      "Paraguay",
      "Peru",
      "Suriname",
      "Uruguay",
      "Venezuela"
    ]
  },
  "Oceania": {
    "Oceania": [
      "Australia",
      "Fiji",
      "Kiribati",
      "Marshall Islands",
      "Micronesia, Federated States of",
      "Nauru",
      "New Zealand",
      "Palau",
      "Papua New Guinea",
      "Samoa",
      "Solomon Islands",
      "Tonga",
      "Tuvalu",
      "Vanuatu"
    ]
  }
};

// Helper function to get all countries as a flat array with codes
export const getAllCountries = () => {
  const countries: Array<{name: string, code: string}> = [];
  
  // Convert country names to country codes (complete mapping)
  const countryCodeMap: Record<string, string> = {
    // Asia - East Asia
    "China": "CN", "Hong Kong": "HK", "Japan": "JP", "Macau": "MO", "Mongolia": "MN", "South Korea": "KR", "Taiwan": "TW",
    
    // Asia - Southeast Asia
    "Brunei": "BN", "Cambodia": "KH", "Indonesia": "ID", "Laos": "LA", "Malaysia": "MY", "Myanmar": "MM", 
    "Philippines": "PH", "Singapore": "SG", "Thailand": "TH", "Timor-Leste": "TL", "Vietnam": "VN",
    
    // Asia - South Asia
    "Afghanistan": "AF", "Bangladesh": "BD", "Bhutan": "BT", "India": "IN", "Maldives": "MV", 
    "Nepal": "NP", "Pakistan": "PK", "Sri Lanka": "LK",
    
    // Asia - Central Asia
    "Kazakhstan": "KZ", "Kyrgyzstan": "KG", "Tajikistan": "TJ", "Turkmenistan": "TM", "Uzbekistan": "UZ",
    
    // Asia - Western Asia (Middle East)
    "Armenia": "AM", "Azerbaijan": "AZ", "Bahrain": "BH", "Cyprus": "CY", "Georgia": "GE",
    "Iran": "IR", "Iraq": "IQ", "Israel": "IL", "Jordan": "JO", "Kuwait": "KW", "Lebanon": "LB",
    "Oman": "OM", "Qatar": "QA", "Saudi Arabia": "SA", "Syria": "SY", "Turkey": "TR", 
    "United Arab Emirates": "AE", "Yemen": "YE",
    
    // Europe - Western Europe
    "Austria": "AT", "Belgium": "BE", "France": "FR", "Germany": "DE", "Liechtenstein": "LI",
    "Luxembourg": "LU", "Monaco": "MC", "Netherlands": "NL", "Switzerland": "CH",
    
    // Europe - Northern Europe
    "Denmark": "DK", "Estonia": "EE", "Finland": "FI", "Iceland": "IS", "Ireland": "IE",
    "Latvia": "LV", "Lithuania": "LT", "Norway": "NO", "Sweden": "SE", "United Kingdom": "GB",
    
    // Europe - Southern Europe
    "Albania": "AL", "Andorra": "AD", "Bosnia and Herzegovina": "BA", "Croatia": "HR", 
    "Greece": "GR", "Italy": "IT", "Malta": "MT", "Montenegro": "ME", "North Macedonia": "MK",
    "Portugal": "PT", "San Marino": "SM", "Serbia": "RS", "Slovenia": "SI", "Spain": "ES", 
    "Vatican City": "VA",
    
    // Europe - Eastern Europe
    "Belarus": "BY", "Bulgaria": "BG", "Czechia": "CZ", "Hungary": "HU", "Moldova": "MD",
    "Poland": "PL", "Romania": "RO", "Russia": "RU", "Slovakia": "SK", "Ukraine": "UA",
    
    // Africa - North Africa
    "Algeria": "DZ", "Egypt": "EG", "Libya": "LY", "Morocco": "MA", "Sudan": "SD", "Tunisia": "TN",
    
    // Africa - Sub-Saharan Africa
    "Angola": "AO", "Benin": "BJ", "Botswana": "BW", "Burkina Faso": "BF", "Burundi": "BI", 
    "Cabo Verde": "CV", "Cameroon": "CM", "Central African Republic": "CF", "Chad": "TD", 
    "Comoros": "KM", "Congo": "CG", "Democratic Republic of the Congo": "CD", "Djibouti": "DJ", 
    "Equatorial Guinea": "GQ", "Eritrea": "ER", "Eswatini": "SZ", "Ethiopia": "ET", "Gabon": "GA", 
    "Gambia": "GM", "Ghana": "GH", "Guinea": "GN", "Guinea-Bissau": "GW", "Ivory Coast": "CI", 
    "Kenya": "KE", "Lesotho": "LS", "Liberia": "LR", "Madagascar": "MG", "Malawi": "MW", 
    "Mali": "ML", "Mauritania": "MR", "Mauritius": "MU", "Mozambique": "MZ", "Namibia": "NA", 
    "Niger": "NE", "Nigeria": "NG", "Rwanda": "RW", "Sao Tome and Principe": "ST", "Senegal": "SN", 
    "Seychelles": "SC", "Sierra Leone": "SL", "Somalia": "SO", "South Africa": "ZA", 
    "South Sudan": "SS", "Tanzania": "TZ", "Togo": "TG", "Uganda": "UG", "Zambia": "ZM", "Zimbabwe": "ZW",
    
    // North America
    "Canada": "CA", "United States": "US", "Mexico": "MX",
    
    // Central America & Caribbean
    "Antigua and Barbuda": "AG", "Bahamas": "BS", "Barbados": "BB", "Belize": "BZ", 
    "Costa Rica": "CR", "Cuba": "CU", "Dominica": "DM", "Dominican Republic": "DO", 
    "El Salvador": "SV", "Grenada": "GD", "Guatemala": "GT", "Haiti": "HT", "Honduras": "HN", 
    "Jamaica": "JM", "Nicaragua": "NI", "Panama": "PA", "Saint Kitts and Nevis": "KN", 
    "Saint Lucia": "LC", "Saint Vincent and the Grenadines": "VC", "Trinidad and Tobago": "TT",
    
    // South America
    "Argentina": "AR", "Bolivia": "BO", "Brazil": "BR", "Chile": "CL", "Colombia": "CO",
    "Ecuador": "EC", "Guyana": "GY", "Paraguay": "PY", "Peru": "PE", "Suriname": "SR", 
    "Uruguay": "UY", "Venezuela": "VE",
    
    // Oceania
    "Australia": "AU", "Fiji": "FJ", "Kiribati": "KI", "Marshall Islands": "MH", 
    "Micronesia, Federated States of": "FM", "Nauru": "NR", "New Zealand": "NZ", "Palau": "PW", 
    "Papua New Guinea": "PG", "Samoa": "WS", "Solomon Islands": "SB", "Tonga": "TO", 
    "Tuvalu": "TV", "Vanuatu": "VU"
  };

  Object.values(countryZoneList).forEach(continentZones => {
    Object.values(continentZones).forEach(countryList => {
      countryList.forEach(countryName => {
        const code = countryCodeMap[countryName] || countryName.substring(0, 2).toUpperCase();
        countries.push({ name: countryName, code });
      });
    });
  });

  return countries.sort((a, b) => a.name.localeCompare(b.name));
};

// Get countries for a specific preset zone
export const getCountriesForZone = (continent: string, region: string): string[] => {
  return countryZoneList[continent as keyof typeof countryZoneList]?.[region] || [];
};

// Get country codes for a preset zone
export const getCountryCodesForZone = (continent: string, region: string): string[] => {
  const countries = getCountriesForZone(continent, region);
  
  // Use the same complete mapping from getAllCountries
  const countryCodeMap: Record<string, string> = {
    // Asia - East Asia
    "China": "CN", "Hong Kong": "HK", "Japan": "JP", "Macau": "MO", "Mongolia": "MN", "South Korea": "KR", "Taiwan": "TW",
    
    // Asia - Southeast Asia
    "Brunei": "BN", "Cambodia": "KH", "Indonesia": "ID", "Laos": "LA", "Malaysia": "MY", "Myanmar": "MM", 
    "Philippines": "PH", "Singapore": "SG", "Thailand": "TH", "Timor-Leste": "TL", "Vietnam": "VN",
    
    // Asia - South Asia
    "Afghanistan": "AF", "Bangladesh": "BD", "Bhutan": "BT", "India": "IN", "Maldives": "MV", 
    "Nepal": "NP", "Pakistan": "PK", "Sri Lanka": "LK",
    
    // Asia - Central Asia
    "Kazakhstan": "KZ", "Kyrgyzstan": "KG", "Tajikistan": "TJ", "Turkmenistan": "TM", "Uzbekistan": "UZ",
    
    // Asia - Western Asia (Middle East)
    "Armenia": "AM", "Azerbaijan": "AZ", "Bahrain": "BH", "Cyprus": "CY", "Georgia": "GE",
    "Iran": "IR", "Iraq": "IQ", "Israel": "IL", "Jordan": "JO", "Kuwait": "KW", "Lebanon": "LB",
    "Oman": "OM", "Qatar": "QA", "Saudi Arabia": "SA", "Syria": "SY", "Turkey": "TR", 
    "United Arab Emirates": "AE", "Yemen": "YE",
    
    // Europe - Western Europe
    "Austria": "AT", "Belgium": "BE", "France": "FR", "Germany": "DE", "Liechtenstein": "LI",
    "Luxembourg": "LU", "Monaco": "MC", "Netherlands": "NL", "Switzerland": "CH",
    
    // Europe - Northern Europe
    "Denmark": "DK", "Estonia": "EE", "Finland": "FI", "Iceland": "IS", "Ireland": "IE",
    "Latvia": "LV", "Lithuania": "LT", "Norway": "NO", "Sweden": "SE", "United Kingdom": "GB",
    
    // Europe - Southern Europe
    "Albania": "AL", "Andorra": "AD", "Bosnia and Herzegovina": "BA", "Croatia": "HR", 
    "Greece": "GR", "Italy": "IT", "Malta": "MT", "Montenegro": "ME", "North Macedonia": "MK",
    "Portugal": "PT", "San Marino": "SM", "Serbia": "RS", "Slovenia": "SI", "Spain": "ES", 
    "Vatican City": "VA",
    
    // Europe - Eastern Europe
    "Belarus": "BY", "Bulgaria": "BG", "Czechia": "CZ", "Hungary": "HU", "Moldova": "MD",
    "Poland": "PL", "Romania": "RO", "Russia": "RU", "Slovakia": "SK", "Ukraine": "UA",
    
    // Africa - North Africa
    "Algeria": "DZ", "Egypt": "EG", "Libya": "LY", "Morocco": "MA", "Sudan": "SD", "Tunisia": "TN",
    
    // Africa - Sub-Saharan Africa
    "Angola": "AO", "Benin": "BJ", "Botswana": "BW", "Burkina Faso": "BF", "Burundi": "BI", 
    "Cabo Verde": "CV", "Cameroon": "CM", "Central African Republic": "CF", "Chad": "TD", 
    "Comoros": "KM", "Congo": "CG", "Democratic Republic of the Congo": "CD", "Djibouti": "DJ", 
    "Equatorial Guinea": "GQ", "Eritrea": "ER", "Eswatini": "SZ", "Ethiopia": "ET", "Gabon": "GA", 
    "Gambia": "GM", "Ghana": "GH", "Guinea": "GN", "Guinea-Bissau": "GW", "Ivory Coast": "CI", 
    "Kenya": "KE", "Lesotho": "LS", "Liberia": "LR", "Madagascar": "MG", "Malawi": "MW", 
    "Mali": "ML", "Mauritania": "MR", "Mauritius": "MU", "Mozambique": "MZ", "Namibia": "NA", 
    "Niger": "NE", "Nigeria": "NG", "Rwanda": "RW", "Sao Tome and Principe": "ST", "Senegal": "SN", 
    "Seychelles": "SC", "Sierra Leone": "SL", "Somalia": "SO", "South Africa": "ZA", 
    "South Sudan": "SS", "Tanzania": "TZ", "Togo": "TG", "Uganda": "UG", "Zambia": "ZM", "Zimbabwe": "ZW",
    
    // North America
    "Canada": "CA", "United States": "US", "Mexico": "MX",
    
    // Central America & Caribbean
    "Antigua and Barbuda": "AG", "Bahamas": "BS", "Barbados": "BB", "Belize": "BZ", 
    "Costa Rica": "CR", "Cuba": "CU", "Dominica": "DM", "Dominican Republic": "DO", 
    "El Salvador": "SV", "Grenada": "GD", "Guatemala": "GT", "Haiti": "HT", "Honduras": "HN", 
    "Jamaica": "JM", "Nicaragua": "NI", "Panama": "PA", "Saint Kitts and Nevis": "KN", 
    "Saint Lucia": "LC", "Saint Vincent and the Grenadines": "VC", "Trinidad and Tobago": "TT",
    
    // South America
    "Argentina": "AR", "Bolivia": "BO", "Brazil": "BR", "Chile": "CL", "Colombia": "CO",
    "Ecuador": "EC", "Guyana": "GY", "Paraguay": "PY", "Peru": "PE", "Suriname": "SR", 
    "Uruguay": "UY", "Venezuela": "VE",
    
    // Oceania
    "Australia": "AU", "Fiji": "FJ", "Kiribati": "KI", "Marshall Islands": "MH", 
    "Micronesia, Federated States of": "FM", "Nauru": "NR", "New Zealand": "NZ", "Palau": "PW", 
    "Papua New Guinea": "PG", "Samoa": "WS", "Solomon Islands": "SB", "Tonga": "TO", 
    "Tuvalu": "TV", "Vanuatu": "VU"
  };
  
  return countries.map(country => {
    const code = countryCodeMap[country];
    if (!code) {
      console.warn(`Missing country code for: ${country}`);
      return country.substring(0, 2).toUpperCase();
    }
    return code;
  });
};