/**
 * Script to fetch countries and territories data from a public API
 * and save it to the countries_and_territories.json file
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Path to save the data
const dataFilePath = path.join(__dirname, '../data/countries_and_territories.json');

// REST Countries API URL - fetches all countries with name, alpha2Code, and alpha3Code
const apiUrl = 'https://restcountries.com/v3.1/all?fields=name,cca2,cca3';

/**
 * Fetch countries data from the REST Countries API
 * and format it to match our application's structure
 */
async function fetchCountriesData() {
  try {
    console.log('Fetching countries data from REST Countries API...');
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const countriesData = await response.json();
    
    // Transform the data to match our application's format
    const formattedData = countriesData.map((country, index) => ({
      id: (index + 1).toString(),
      name: country.name.common,
      code: country.cca2,
      alpha3: country.cca3,
      official_name: country.name.official || country.name.common
    }));
    
    // Sort countries alphabetically by name
    formattedData.sort((a, b) => a.name.localeCompare(b.name));
    
    // Save the data to the file
    fs.writeFileSync(dataFilePath, JSON.stringify(formattedData, null, 2));
    
    console.log(`Successfully fetched and saved data for ${formattedData.length} countries and territories.`);
    console.log(`Data saved to: ${dataFilePath}`);
    
    return formattedData;
  } catch (error) {
    console.error('Error fetching countries data:', error);
    
    // If the API call fails, create a fallback with some major countries
    const fallbackData = createFallbackData();
    fs.writeFileSync(dataFilePath, JSON.stringify(fallbackData, null, 2));
    
    console.log(`Failed to fetch from API. Created fallback data with ${fallbackData.length} countries.`);
    console.log(`Fallback data saved to: ${dataFilePath}`);
    
    return fallbackData;
  }
}

/**
 * Create fallback data with major countries in case the API call fails
 */
function createFallbackData() {
  return [
    { id: "1", name: "Afghanistan", code: "AF", alpha3: "AFG" },
    { id: "2", name: "Albania", code: "AL", alpha3: "ALB" },
    { id: "3", name: "Algeria", code: "DZ", alpha3: "DZA" },
    { id: "4", name: "Andorra", code: "AD", alpha3: "AND" },
    { id: "5", name: "Angola", code: "AO", alpha3: "AGO" },
    { id: "6", name: "Antigua and Barbuda", code: "AG", alpha3: "ATG" },
    { id: "7", name: "Argentina", code: "AR", alpha3: "ARG" },
    { id: "8", name: "Armenia", code: "AM", alpha3: "ARM" },
    { id: "9", name: "Australia", code: "AU", alpha3: "AUS" },
    { id: "10", name: "Austria", code: "AT", alpha3: "AUT" },
    { id: "11", name: "Azerbaijan", code: "AZ", alpha3: "AZE" },
    { id: "12", name: "Bahamas", code: "BS", alpha3: "BHS" },
    { id: "13", name: "Bahrain", code: "BH", alpha3: "BHR" },
    { id: "14", name: "Bangladesh", code: "BD", alpha3: "BGD" },
    { id: "15", name: "Barbados", code: "BB", alpha3: "BRB" },
    { id: "16", name: "Belarus", code: "BY", alpha3: "BLR" },
    { id: "17", name: "Belgium", code: "BE", alpha3: "BEL" },
    { id: "18", name: "Belize", code: "BZ", alpha3: "BLZ" },
    { id: "19", name: "Benin", code: "BJ", alpha3: "BEN" },
    { id: "20", name: "Bhutan", code: "BT", alpha3: "BTN" },
    { id: "21", name: "Bolivia", code: "BO", alpha3: "BOL" },
    { id: "22", name: "Bosnia and Herzegovina", code: "BA", alpha3: "BIH" },
    { id: "23", name: "Botswana", code: "BW", alpha3: "BWA" },
    { id: "24", name: "Brazil", code: "BR", alpha3: "BRA" },
    { id: "25", name: "Brunei", code: "BN", alpha3: "BRN" },
    { id: "26", name: "Bulgaria", code: "BG", alpha3: "BGR" },
    { id: "27", name: "Burkina Faso", code: "BF", alpha3: "BFA" },
    { id: "28", name: "Burundi", code: "BI", alpha3: "BDI" },
    { id: "29", name: "Cabo Verde", code: "CV", alpha3: "CPV" },
    { id: "30", name: "Cambodia", code: "KH", alpha3: "KHM" },
    { id: "31", name: "Cameroon", code: "CM", alpha3: "CMR" },
    { id: "32", name: "Canada", code: "CA", alpha3: "CAN" },
    { id: "33", name: "Central African Republic", code: "CF", alpha3: "CAF" },
    { id: "34", name: "Chad", code: "TD", alpha3: "TCD" },
    { id: "35", name: "Chile", code: "CL", alpha3: "CHL" },
    { id: "36", name: "China", code: "CN", alpha3: "CHN" },
    { id: "37", name: "Colombia", code: "CO", alpha3: "COL" },
    { id: "38", name: "Comoros", code: "KM", alpha3: "COM" },
    { id: "39", name: "Congo (Congo-Brazzaville)", code: "CG", alpha3: "COG" },
    { id: "40", name: "Costa Rica", code: "CR", alpha3: "CRI" },
    { id: "41", name: "Croatia", code: "HR", alpha3: "HRV" },
    { id: "42", name: "Cuba", code: "CU", alpha3: "CUB" },
    { id: "43", name: "Cyprus", code: "CY", alpha3: "CYP" },
    { id: "44", name: "Czechia", code: "CZ", alpha3: "CZE" },
    { id: "45", name: "Denmark", code: "DK", alpha3: "DNK" },
    { id: "46", name: "Djibouti", code: "DJ", alpha3: "DJI" },
    { id: "47", name: "Dominica", code: "DM", alpha3: "DMA" },
    { id: "48", name: "Dominican Republic", code: "DO", alpha3: "DOM" },
    { id: "49", name: "DR Congo", code: "CD", alpha3: "COD" },
    { id: "50", name: "Ecuador", code: "EC", alpha3: "ECU" },
    { id: "51", name: "Egypt", code: "EG", alpha3: "EGY" },
    { id: "52", name: "El Salvador", code: "SV", alpha3: "SLV" },
    { id: "53", name: "Equatorial Guinea", code: "GQ", alpha3: "GNQ" },
    { id: "54", name: "Eritrea", code: "ER", alpha3: "ERI" },
    { id: "55", name: "Estonia", code: "EE", alpha3: "EST" },
    { id: "56", name: "Eswatini", code: "SZ", alpha3: "SWZ" },
    { id: "57", name: "Ethiopia", code: "ET", alpha3: "ETH" },
    { id: "58", name: "Fiji", code: "FJ", alpha3: "FJI" },
    { id: "59", name: "Finland", code: "FI", alpha3: "FIN" },
    { id: "60", name: "France", code: "FR", alpha3: "FRA" },
    { id: "61", name: "Gabon", code: "GA", alpha3: "GAB" },
    { id: "62", name: "Gambia", code: "GM", alpha3: "GMB" },
    { id: "63", name: "Georgia", code: "GE", alpha3: "GEO" },
    { id: "64", name: "Germany", code: "DE", alpha3: "DEU" },
    { id: "65", name: "Ghana", code: "GH", alpha3: "GHA" },
    { id: "66", name: "Greece", code: "GR", alpha3: "GRC" },
    { id: "67", name: "Grenada", code: "GD", alpha3: "GRD" },
    { id: "68", name: "Guatemala", code: "GT", alpha3: "GTM" },
    { id: "69", name: "Guinea", code: "GN", alpha3: "GIN" },
    { id: "70", name: "Guinea-Bissau", code: "GW", alpha3: "GNB" },
    { id: "71", name: "Guyana", code: "GY", alpha3: "GUY" },
    { id: "72", name: "Haiti", code: "HT", alpha3: "HTI" },
    { id: "73", name: "Holy See", code: "VA", alpha3: "VAT" },
    { id: "74", name: "Honduras", code: "HN", alpha3: "HND" },
    { id: "75", name: "Hungary", code: "HU", alpha3: "HUN" },
    { id: "76", name: "Iceland", code: "IS", alpha3: "ISL" },
    { id: "77", name: "India", code: "IN", alpha3: "IND" },
    { id: "78", name: "Indonesia", code: "ID", alpha3: "IDN" },
    { id: "79", name: "Iran", code: "IR", alpha3: "IRN" },
    { id: "80", name: "Iraq", code: "IQ", alpha3: "IRQ" },
    { id: "81", name: "Ireland", code: "IE", alpha3: "IRL" },
    { id: "82", name: "Israel", code: "IL", alpha3: "ISR" },
    { id: "83", name: "Italy", code: "IT", alpha3: "ITA" },
    { id: "84", name: "Jamaica", code: "JM", alpha3: "JAM" },
    { id: "85", name: "Japan", code: "JP", alpha3: "JPN" },
    { id: "86", name: "Jordan", code: "JO", alpha3: "JOR" },
    { id: "87", name: "Kazakhstan", code: "KZ", alpha3: "KAZ" },
    { id: "88", name: "Kenya", code: "KE", alpha3: "KEN" },
    { id: "89", name: "Kiribati", code: "KI", alpha3: "KIR" },
    { id: "90", name: "Kuwait", code: "KW", alpha3: "KWT" },
    { id: "91", name: "Kyrgyzstan", code: "KG", alpha3: "KGZ" },
    { id: "92", name: "Laos", code: "LA", alpha3: "LAO" },
    { id: "93", name: "Latvia", code: "LV", alpha3: "LVA" },
    { id: "94", name: "Lebanon", code: "LB", alpha3: "LBN" },
    { id: "95", name: "Lesotho", code: "LS", alpha3: "LSO" },
    { id: "96", name: "Liberia", code: "LR", alpha3: "LBR" },
    { id: "97", name: "Libya", code: "LY", alpha3: "LBY" },
    { id: "98", name: "Liechtenstein", code: "LI", alpha3: "LIE" },
    { id: "99", name: "Lithuania", code: "LT", alpha3: "LTU" },
    { id: "100", name: "Luxembourg", code: "LU", alpha3: "LUX" },
    { id: "101", name: "Madagascar", code: "MG", alpha3: "MDG" },
    { id: "102", name: "Malawi", code: "MW", alpha3: "MWI" },
    { id: "103", name: "Malaysia", code: "MY", alpha3: "MYS" },
    { id: "104", name: "Maldives", code: "MV", alpha3: "MDV" },
    { id: "105", name: "Mali", code: "ML", alpha3: "MLI" },
    { id: "106", name: "Malta", code: "MT", alpha3: "MLT" },
    { id: "107", name: "Marshall Islands", code: "MH", alpha3: "MHL" },
    { id: "108", name: "Mauritania", code: "MR", alpha3: "MRT" },
    { id: "109", name: "Mauritius", code: "MU", alpha3: "MUS" },
    { id: "110", name: "Mexico", code: "MX", alpha3: "MEX" },
    { id: "111", name: "Micronesia", code: "FM", alpha3: "FSM" },
    { id: "112", name: "Moldova", code: "MD", alpha3: "MDA" },
    { id: "113", name: "Monaco", code: "MC", alpha3: "MCO" },
    { id: "114", name: "Mongolia", code: "MN", alpha3: "MNG" },
    { id: "115", name: "Montenegro", code: "ME", alpha3: "MNE" },
    { id: "116", name: "Morocco", code: "MA", alpha3: "MAR" },
    { id: "117", name: "Mozambique", code: "MZ", alpha3: "MOZ" },
    { id: "118", name: "Myanmar", code: "MM", alpha3: "MMR" },
    { id: "119", name: "Namibia", code: "NA", alpha3: "NAM" },
    { id: "120", name: "Nauru", code: "NR", alpha3: "NRU" },
    { id: "121", name: "Nepal", code: "NP", alpha3: "NPL" },
    { id: "122", name: "Netherlands", code: "NL", alpha3: "NLD" },
    { id: "123", name: "New Zealand", code: "NZ", alpha3: "NZL" },
    { id: "124", name: "Nicaragua", code: "NI", alpha3: "NIC" },
    { id: "125", name: "Niger", code: "NE", alpha3: "NER" },
    { id: "126", name: "Nigeria", code: "NG", alpha3: "NGA" },
    { id: "127", name: "North Korea", code: "KP", alpha3: "PRK" },
    { id: "128", name: "North Macedonia", code: "MK", alpha3: "MKD" },
    { id: "129", name: "Norway", code: "NO", alpha3: "NOR" },
    { id: "130", name: "Oman", code: "OM", alpha3: "OMN" },
    { id: "131", name: "Pakistan", code: "PK", alpha3: "PAK" },
    { id: "132", name: "Palau", code: "PW", alpha3: "PLW" },
    { id: "133", name: "Palestine", code: "PS", alpha3: "PSE" },
    { id: "134", name: "Panama", code: "PA", alpha3: "PAN" },
    { id: "135", name: "Papua New Guinea", code: "PG", alpha3: "PNG" },
    { id: "136", name: "Paraguay", code: "PY", alpha3: "PRY" },
    { id: "137", name: "Peru", code: "PE", alpha3: "PER" },
    { id: "138", name: "Philippines", code: "PH", alpha3: "PHL" },
    { id: "139", name: "Poland", code: "PL", alpha3: "POL" },
    { id: "140", name: "Portugal", code: "PT", alpha3: "PRT" },
    { id: "141", name: "Qatar", code: "QA", alpha3: "QAT" },
    { id: "142", name: "Romania", code: "RO", alpha3: "ROU" },
    { id: "143", name: "Russia", code: "RU", alpha3: "RUS" },
    { id: "144", name: "Rwanda", code: "RW", alpha3: "RWA" },
    { id: "145", name: "Saint Kitts and Nevis", code: "KN", alpha3: "KNA" },
    { id: "146", name: "Saint Lucia", code: "LC", alpha3: "LCA" },
    { id: "147", name: "Saint Vincent and the Grenadines", code: "VC", alpha3: "VCT" },
    { id: "148", name: "Samoa", code: "WS", alpha3: "WSM" },
    { id: "149", name: "San Marino", code: "SM", alpha3: "SMR" },
    { id: "150", name: "Sao Tome and Principe", code: "ST", alpha3: "STP" },
    { id: "151", name: "Saudi Arabia", code: "SA", alpha3: "SAU" },
    { id: "152", name: "Senegal", code: "SN", alpha3: "SEN" },
    { id: "153", name: "Serbia", code: "RS", alpha3: "SRB" },
    { id: "154", name: "Seychelles", code: "SC", alpha3: "SYC" },
    { id: "155", name: "Sierra Leone", code: "SL", alpha3: "SLE" },
    { id: "156", name: "Singapore", code: "SG", alpha3: "SGP" },
    { id: "157", name: "Slovakia", code: "SK", alpha3: "SVK" },
    { id: "158", name: "Slovenia", code: "SI", alpha3: "SVN" },
    { id: "159", name: "Solomon Islands", code: "SB", alpha3: "SLB" },
    { id: "160", name: "Somalia", code: "SO", alpha3: "SOM" },
    { id: "161", name: "South Africa", code: "ZA", alpha3: "ZAF" },
    { id: "162", name: "South Korea", code: "KR", alpha3: "KOR" },
    { id: "163", name: "South Sudan", code: "SS", alpha3: "SSD" },
    { id: "164", name: "Spain", code: "ES", alpha3: "ESP" },
    { id: "165", name: "Sri Lanka", code: "LK", alpha3: "LKA" },
    { id: "166", name: "Sudan", code: "SD", alpha3: "SDN" },
    { id: "167", name: "Suriname", code: "SR", alpha3: "SUR" },
    { id: "168", name: "Sweden", code: "SE", alpha3: "SWE" },
    { id: "169", name: "Switzerland", code: "CH", alpha3: "CHE" },
    { id: "170", name: "Syria", code: "SY", alpha3: "SYR" },
    { id: "171", name: "Tajikistan", code: "TJ", alpha3: "TJK" },
    { id: "172", name: "Tanzania", code: "TZ", alpha3: "TZA" },
    { id: "173", name: "Thailand", code: "TH", alpha3: "THA" },
    { id: "174", name: "Timor-Leste", code: "TL", alpha3: "TLS" },
    { id: "175", name: "Togo", code: "TG", alpha3: "TGO" },
    { id: "176", name: "Tonga", code: "TO", alpha3: "TON" },
    { id: "177", name: "Trinidad and Tobago", code: "TT", alpha3: "TTO" },
    { id: "178", name: "Tunisia", code: "TN", alpha3: "TUN" },
    { id: "179", name: "Turkey", code: "TR", alpha3: "TUR" },
    { id: "180", name: "Turkmenistan", code: "TM", alpha3: "TKM" },
    { id: "181", name: "Tuvalu", code: "TV", alpha3: "TUV" },
    { id: "182", name: "Uganda", code: "UG", alpha3: "UGA" },
    { id: "183", name: "Ukraine", code: "UA", alpha3: "UKR" },
    { id: "184", name: "United Arab Emirates", code: "AE", alpha3: "ARE" },
    { id: "185", name: "United Kingdom", code: "GB", alpha3: "GBR" },
    { id: "186", name: "United States", code: "US", alpha3: "USA" },
    { id: "187", name: "Uruguay", code: "UY", alpha3: "URY" },
    { id: "188", name: "Uzbekistan", code: "UZ", alpha3: "UZB" },
    { id: "189", name: "Vanuatu", code: "VU", alpha3: "VUT" },
    { id: "190", name: "Venezuela", code: "VE", alpha3: "VEN" },
    { id: "191", name: "Vietnam", code: "VN", alpha3: "VNM" },
    { id: "192", name: "Yemen", code: "YE", alpha3: "YEM" },
    { id: "193", name: "Zambia", code: "ZM", alpha3: "ZMB" },
    { id: "194", name: "Zimbabwe", code: "ZW", alpha3: "ZWE" }
  ];
}

// Run the script
fetchCountriesData().catch(error => {
  console.error('Script error:', error);
  process.exit(1);
});
