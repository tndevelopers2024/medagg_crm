// Comprehensive mapping of Indian cities to their states
// Covers all major cities and common spelling variations

const CITY_STATE_MAP = {
  // Andhra Pradesh
  "visakhapatnam": "Andhra Pradesh",
  "vizag": "Andhra Pradesh",
  "vijayawada": "Andhra Pradesh",
  "guntur": "Andhra Pradesh",
  "nellore": "Andhra Pradesh",
  "kurnool": "Andhra Pradesh",
  "rajahmundry": "Andhra Pradesh",
  "kakinada": "Andhra Pradesh",
  "tirupati": "Andhra Pradesh",
  "anantapur": "Andhra Pradesh",
  "kadapa": "Andhra Pradesh",
  "ongole": "Andhra Pradesh",
  "eluru": "Andhra Pradesh",
  "nandyal": "Andhra Pradesh",
  "chittoor": "Andhra Pradesh",
  "hindupur": "Andhra Pradesh",

  // Arunachal Pradesh
  "itanagar": "Arunachal Pradesh",

  // Assam
  "guwahati": "Assam",
  "silchar": "Assam",
  "dibrugarh": "Assam",
  "jorhat": "Assam",
  "nagaon": "Assam",
  "tinsukia": "Assam",

  // Bihar
  "patna": "Bihar",
  "gaya": "Bihar",
  "bhagalpur": "Bihar",
  "muzaffarpur": "Bihar",
  "darbhanga": "Bihar",
  "purnia": "Bihar",
  "arrah": "Bihar",
  "begusarai": "Bihar",

  // Chhattisgarh
  "raipur": "Chhattisgarh",
  "bhilai": "Chhattisgarh",
  "bilaspur": "Chhattisgarh",
  "korba": "Chhattisgarh",
  "durg": "Chhattisgarh",
  "rajnandgaon": "Chhattisgarh",

  // Goa
  "panaji": "Goa",
  "margao": "Goa",
  "vasco da gama": "Goa",
  "mapusa": "Goa",

  // Gujarat
  "ahmedabad": "Gujarat",
  "surat": "Gujarat",
  "vadodara": "Gujarat",
  "baroda": "Gujarat",
  "rajkot": "Gujarat",
  "bhavnagar": "Gujarat",
  "jamnagar": "Gujarat",
  "gandhinagar": "Gujarat",
  "anand": "Gujarat",
  "morbi": "Gujarat",
  "nadiad": "Gujarat",
  "mehsana": "Gujarat",
  "surendranagar": "Gujarat",
  "junagadh": "Gujarat",
  "porbandar": "Gujarat",

  // Haryana
  "gurugram": "Haryana",
  "gurgaon": "Haryana",
  "faridabad": "Haryana",
  "hisar": "Haryana",
  "rohtak": "Haryana",
  "panipat": "Haryana",
  "karnal": "Haryana",
  "sonipat": "Haryana",
  "ambala": "Haryana",
  "yamunanagar": "Haryana",
  "panchkula": "Haryana",
  "bhiwani": "Haryana",
  "kurukshetra": "Haryana",

  // Himachal Pradesh
  "shimla": "Himachal Pradesh",
  "dharamshala": "Himachal Pradesh",
  "solan": "Himachal Pradesh",
  "mandi": "Himachal Pradesh",

  // Jharkhand
  "ranchi": "Jharkhand",
  "jamshedpur": "Jharkhand",
  "dhanbad": "Jharkhand",
  "bokaro": "Jharkhand",
  "hazaribagh": "Jharkhand",

  // Karnataka
  "bengaluru": "Karnataka",
  "bangalore": "Karnataka",
  "mysuru": "Karnataka",
  "mysore": "Karnataka",
  "mangaluru": "Karnataka",
  "mangalore": "Karnataka",
  "hubli": "Karnataka",
  "hubballi": "Karnataka",
  "dharwad": "Karnataka",
  "belagavi": "Karnataka",
  "belgaum": "Karnataka",
  "tumakuru": "Karnataka",
  "tumkur": "Karnataka",
  "shivamogga": "Karnataka",
  "shimoga": "Karnataka",
  "davanagere": "Karnataka",
  "davangere": "Karnataka",
  "ballari": "Karnataka",
  "bellary": "Karnataka",
  "bidar": "Karnataka",
  "kalaburagi": "Karnataka",
  "gulbarga": "Karnataka",
  "raichur": "Karnataka",
  "bijapur": "Karnataka",
  "vijayapura": "Karnataka",
  "hassan": "Karnataka",
  "mandya": "Karnataka",
  "udupi": "Karnataka",
  "chikmagalur": "Karnataka",
  "chitradurga": "Karnataka",
  "kodagu": "Karnataka",
  "coorg": "Karnataka",
  "kolar": "Karnataka",
  "bagalkot": "Karnataka",
  "yadgir": "Karnataka",
  "koppal": "Karnataka",
  "gadag": "Karnataka",
  "haveri": "Karnataka",

  // Kerala
  "thiruvananthapuram": "Kerala",
  "trivandrum": "Kerala",
  "kochi": "Kerala",
  "cochin": "Kerala",
  "ernakulam": "Kerala",
  "kozhikode": "Kerala",
  "calicut": "Kerala",
  "thrissur": "Kerala",
  "trichur": "Kerala",
  "kollam": "Kerala",
  "palakkad": "Kerala",
  "malappuram": "Kerala",
  "kannur": "Kerala",
  "cannanore": "Kerala",
  "kottayam": "Kerala",
  "alappuzha": "Kerala",
  "alleppey": "Kerala",
  "pathanamthitta": "Kerala",
  "idukki": "Kerala",
  "wayanad": "Kerala",
  "kasaragod": "Kerala",

  // Madhya Pradesh
  "bhopal": "Madhya Pradesh",
  "indore": "Madhya Pradesh",
  "jabalpur": "Madhya Pradesh",
  "gwalior": "Madhya Pradesh",
  "ujjain": "Madhya Pradesh",
  "sagar": "Madhya Pradesh",
  "dewas": "Madhya Pradesh",
  "satna": "Madhya Pradesh",
  "ratlam": "Madhya Pradesh",
  "rewa": "Madhya Pradesh",

  // Maharashtra
  "mumbai": "Maharashtra",
  "bombay": "Maharashtra",
  "pune": "Maharashtra",
  "nagpur": "Maharashtra",
  "nashik": "Maharashtra",
  "aurangabad": "Maharashtra",
  "solapur": "Maharashtra",
  "kolhapur": "Maharashtra",
  "amravati": "Maharashtra",
  "nanded": "Maharashtra",
  "thane": "Maharashtra",
  "kalyan": "Maharashtra",
  "vasai": "Maharashtra",
  "virar": "Maharashtra",
  "sangli": "Maharashtra",
  "malegaon": "Maharashtra",
  "jalgaon": "Maharashtra",
  "akola": "Maharashtra",
  "latur": "Maharashtra",
  "dhule": "Maharashtra",
  "ahmednagar": "Maharashtra",
  "chandrapur": "Maharashtra",
  "parbhani": "Maharashtra",
  "navi mumbai": "Maharashtra",
  "ulhasnagar": "Maharashtra",
  "panvel": "Maharashtra",

  // Manipur
  "imphal": "Manipur",

  // Meghalaya
  "shillong": "Meghalaya",

  // Mizoram
  "aizawl": "Mizoram",

  // Nagaland
  "kohima": "Nagaland",
  "dimapur": "Nagaland",

  // Odisha
  "bhubaneswar": "Odisha",
  "cuttack": "Odisha",
  "rourkela": "Odisha",
  "brahmapur": "Odisha",
  "berhampur": "Odisha",
  "sambalpur": "Odisha",
  "puri": "Odisha",

  // Punjab
  "ludhiana": "Punjab",
  "amritsar": "Punjab",
  "jalandhar": "Punjab",
  "patiala": "Punjab",
  "bathinda": "Punjab",
  "mohali": "Punjab",
  "pathankot": "Punjab",
  "hoshiarpur": "Punjab",
  "gurdaspur": "Punjab",
  "moga": "Punjab",
  "firozpur": "Punjab",

  // Rajasthan
  "jaipur": "Rajasthan",
  "jodhpur": "Rajasthan",
  "udaipur": "Rajasthan",
  "kota": "Rajasthan",
  "ajmer": "Rajasthan",
  "bikaner": "Rajasthan",
  "alwar": "Rajasthan",
  "bharatpur": "Rajasthan",
  "bhilwara": "Rajasthan",
  "sikar": "Rajasthan",
  "pali": "Rajasthan",
  "barmer": "Rajasthan",

  // Sikkim
  "gangtok": "Sikkim",

  // Tamil Nadu
  "chennai": "Tamil Nadu",
  "madras": "Tamil Nadu",
  "coimbatore": "Tamil Nadu",
  "madurai": "Tamil Nadu",
  "tiruchirappalli": "Tamil Nadu",
  "trichy": "Tamil Nadu",
  "tiruchirapalli": "Tamil Nadu",
  "salem": "Tamil Nadu",
  "tirunelveli": "Tamil Nadu",
  "tirupur": "Tamil Nadu",
  "tiruppur": "Tamil Nadu",
  "erode": "Tamil Nadu",
  "vellore": "Tamil Nadu",
  "thoothukudi": "Tamil Nadu",
  "tuticorin": "Tamil Nadu",
  "dindigul": "Tamil Nadu",
  "thanjavur": "Tamil Nadu",
  "ranipet": "Tamil Nadu",
  "sivakasi": "Tamil Nadu",
  "karur": "Tamil Nadu",
  "udhagamandalam": "Tamil Nadu",
  "ooty": "Tamil Nadu",
  "hosur": "Tamil Nadu",
  "nagercoil": "Tamil Nadu",
  "kanchipuram": "Tamil Nadu",
  "kumbakonam": "Tamil Nadu",
  "cuddalore": "Tamil Nadu",
  "ambattur": "Tamil Nadu",
  "tambaram": "Tamil Nadu",
  "avadi": "Tamil Nadu",
  "namakkal": "Tamil Nadu",
  "palayamkottai": "Tamil Nadu",
  "pudukkottai": "Tamil Nadu",
  "krishnagiri": "Tamil Nadu",

  // Telangana
  "hyderabad": "Telangana",
  "secunderabad": "Telangana",
  "warangal": "Telangana",
  "nizamabad": "Telangana",
  "karimnagar": "Telangana",
  "khammam": "Telangana",
  "ramagundam": "Telangana",
  "mancherial": "Telangana",

  // Tripura
  "agartala": "Tripura",

  // Uttar Pradesh
  "lucknow": "Uttar Pradesh",
  "kanpur": "Uttar Pradesh",
  "agra": "Uttar Pradesh",
  "varanasi": "Uttar Pradesh",
  "banaras": "Uttar Pradesh",
  "benares": "Uttar Pradesh",
  "prayagraj": "Uttar Pradesh",
  "allahabad": "Uttar Pradesh",
  "meerut": "Uttar Pradesh",
  "ghaziabad": "Uttar Pradesh",
  "noida": "Uttar Pradesh",
  "mathura": "Uttar Pradesh",
  "bareilly": "Uttar Pradesh",
  "aligarh": "Uttar Pradesh",
  "moradabad": "Uttar Pradesh",
  "saharanpur": "Uttar Pradesh",
  "gorakhpur": "Uttar Pradesh",
  "firozabad": "Uttar Pradesh",
  "jhansi": "Uttar Pradesh",
  "muzaffarnagar": "Uttar Pradesh",
  "ayodhya": "Uttar Pradesh",
  "faizabad": "Uttar Pradesh",
  "rampur": "Uttar Pradesh",
  "shahjahanpur": "Uttar Pradesh",
  "mau": "Uttar Pradesh",

  // Uttarakhand
  "dehradun": "Uttarakhand",
  "haridwar": "Uttarakhand",
  "roorkee": "Uttarakhand",
  "haldwani": "Uttarakhand",
  "rudrapur": "Uttarakhand",

  // West Bengal
  "kolkata": "West Bengal",
  "calcutta": "West Bengal",
  "howrah": "West Bengal",
  "siliguri": "West Bengal",
  "durgapur": "West Bengal",
  "asansol": "West Bengal",
  "bardhaman": "West Bengal",
  "malda": "West Bengal",
  "jalpaiguri": "West Bengal",
  "kharagpur": "West Bengal",

  // Union Territories
  // Andaman and Nicobar Islands
  "port blair": "Andaman and Nicobar Islands",

  // Chandigarh
  "chandigarh": "Chandigarh",

  // Dadra and Nagar Haveli and Daman and Diu
  "daman": "Dadra and Nagar Haveli and Daman and Diu",
  "diu": "Dadra and Nagar Haveli and Daman and Diu",
  "silvassa": "Dadra and Nagar Haveli and Daman and Diu",

  // Delhi
  "delhi": "Delhi",
  "new delhi": "Delhi",

  // Jammu and Kashmir
  "srinagar": "Jammu and Kashmir",
  "jammu": "Jammu and Kashmir",
  "anantnag": "Jammu and Kashmir",
  "baramulla": "Jammu and Kashmir",

  // Ladakh
  "leh": "Ladakh",
  "kargil": "Ladakh",

  // Lakshadweep
  "kavaratti": "Lakshadweep",

  // Puducherry
  "puducherry": "Puducherry",
  "pondicherry": "Puducherry",
  "karaikal": "Puducherry",
  "mahe": "Puducherry",
  "yanam": "Puducherry",
};

/**
 * Get the state name for a given Indian city.
 * Case-insensitive lookup with trimming.
 * @param {string} cityName
 * @returns {string|null}
 */
export function getStateFromCity(cityName) {
  if (!cityName) return null;
  const normalized = String(cityName).trim().toLowerCase();
  return CITY_STATE_MAP[normalized] || null;
}
