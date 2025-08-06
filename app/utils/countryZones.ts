export const countryZoneList = {
  "Asia": {
    "East Asia": [
      "China",
      "Hong Kong",
      "Japan",
      "Mongolia",
      "South Korea",
      "Taiwan"
    ],
    "Southeast Asia": [
      "Brunei",
      "Indonesia",
      "Malaysia",
      "Myanmar",
      "Philippines",
      "Singapore",
      "Thailand",
      "Timor-Leste",
      "Vietnam"
    ],
    "South Asia": [
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
      "Palestine",
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
      "Czech Republic",
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
      "Botswana",
      "Cameroon",
      "Côte d'Ivoire",
      "Ethiopia",
      "Ghana",
      "Kenya",
      "Madagascar",
      "Mozambique",
      "Namibia",
      "Nigeria",
      "Rwanda",
      "Senegal",
      "South Africa",
      "Tanzania",
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
      "Bahamas",
      "Barbados",
      "Belize",
      "Costa Rica",
      "Cuba",
      "Dominican Republic",
      "El Salvador",
      "Guatemala",
      "Honduras",
      "Jamaica",
      "Nicaragua",
      "Panama",
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
      "Paraguay",
      "Peru",
      "Uruguay",
      "Venezuela"
    ]
  },
  "Oceania": {
    "Oceania": [
      "Australia",
      "Fiji",
      "Kiribati",
      "Micronesia",
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
  
  // Convert country names to country codes (simplified mapping)
  const countryCodeMap: Record<string, string> = {
    "China": "CN", "Hong Kong": "HK", "Japan": "JP", "Mongolia": "MN", "South Korea": "KR", "Taiwan": "TW",
    "Brunei": "BN", "Indonesia": "ID", "Malaysia": "MY", "Myanmar": "MM", "Philippines": "PH", 
    "Singapore": "SG", "Thailand": "TH", "Timor-Leste": "TL", "Vietnam": "VN",
    "Bangladesh": "BD", "Bhutan": "BT", "India": "IN", "Maldives": "MV", "Nepal": "NP", 
    "Pakistan": "PK", "Sri Lanka": "LK",
    "Kazakhstan": "KZ", "Kyrgyzstan": "KG", "Tajikistan": "TJ", "Turkmenistan": "TM", "Uzbekistan": "UZ",
    "Armenia": "AM", "Azerbaijan": "AZ", "Bahrain": "BH", "Cyprus": "CY", "Georgia": "GE",
    "Iran": "IR", "Iraq": "IQ", "Israel": "IL", "Jordan": "JO", "Kuwait": "KW", "Lebanon": "LB",
    "Oman": "OM", "Palestine": "PS", "Qatar": "QA", "Saudi Arabia": "SA", "Syria": "SY",
    "Turkey": "TR", "United Arab Emirates": "AE", "Yemen": "YE",
    "Austria": "AT", "Belgium": "BE", "France": "FR", "Germany": "DE", "Liechtenstein": "LI",
    "Luxembourg": "LU", "Monaco": "MC", "Netherlands": "NL", "Switzerland": "CH",
    "Denmark": "DK", "Estonia": "EE", "Finland": "FI", "Iceland": "IS", "Ireland": "IE",
    "Latvia": "LV", "Lithuania": "LT", "Norway": "NO", "Sweden": "SE", "United Kingdom": "GB",
    "Albania": "AL", "Andorra": "AD", "Bosnia and Herzegovina": "BA", "Croatia": "HR", 
    "Greece": "GR", "Italy": "IT", "Malta": "MT", "Montenegro": "ME", "North Macedonia": "MK",
    "Portugal": "PT", "San Marino": "SM", "Serbia": "RS", "Slovenia": "SI", "Spain": "ES", 
    "Vatican City": "VA",
    "Belarus": "BY", "Bulgaria": "BG", "Czech Republic": "CZ", "Hungary": "HU", "Moldova": "MD",
    "Poland": "PL", "Romania": "RO", "Russia": "RU", "Slovakia": "SK", "Ukraine": "UA",
    "Algeria": "DZ", "Egypt": "EG", "Libya": "LY", "Morocco": "MA", "Sudan": "SD", "Tunisia": "TN",
    "Angola": "AO", "Botswana": "BW", "Cameroon": "CM", "Côte d'Ivoire": "CI", "Ethiopia": "ET",
    "Ghana": "GH", "Kenya": "KE", "Madagascar": "MG", "Mozambique": "MZ", "Namibia": "NA",
    "Nigeria": "NG", "Rwanda": "RW", "Senegal": "SN", "South Africa": "ZA", "Tanzania": "TZ",
    "Uganda": "UG", "Zambia": "ZM", "Zimbabwe": "ZW",
    "Canada": "CA", "United States": "US", "Mexico": "MX",
    "Bahamas": "BS", "Barbados": "BB", "Belize": "BZ", "Costa Rica": "CR", "Cuba": "CU",
    "Dominican Republic": "DO", "El Salvador": "SV", "Guatemala": "GT", "Honduras": "HN",
    "Jamaica": "JM", "Nicaragua": "NI", "Panama": "PA", "Trinidad and Tobago": "TT",
    "Argentina": "AR", "Bolivia": "BO", "Brazil": "BR", "Chile": "CL", "Colombia": "CO",
    "Ecuador": "EC", "Paraguay": "PY", "Peru": "PE", "Uruguay": "UY", "Venezuela": "VE",
    "Australia": "AU", "Fiji": "FJ", "Kiribati": "KI", "Micronesia": "FM", "Nauru": "NR",
    "New Zealand": "NZ", "Palau": "PW", "Papua New Guinea": "PG", "Samoa": "WS",
    "Solomon Islands": "SB", "Tonga": "TO", "Tuvalu": "TV", "Vanuatu": "VU"
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
  const countryCodeMap: Record<string, string> = {
    // Same mapping as above - abbreviated for brevity
    "United States": "US", "Canada": "CA", "Mexico": "MX", "United Kingdom": "GB",
    "Germany": "DE", "France": "FR", "Italy": "IT", "Spain": "ES", "Netherlands": "NL",
    "China": "CN", "Japan": "JP", "South Korea": "KR", "Singapore": "SG", "Australia": "AU",
    // Add more as needed...
  };
  
  return countries.map(country => countryCodeMap[country] || country.substring(0, 2).toUpperCase());
};