export interface Country {
  iso2: string;
  name: string;
  nameEn: string;
  dialCode: string;
  sample: string;
}

export function countryFlag(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)));
}

export const COUNTRIES: Country[] = [
  // ── Arab countries first ────────────────────────────────────────
  { iso2: "EG", name: "مصر",               nameEn: "Egypt",               dialCode: "+20",   sample: "1012345678" },
  { iso2: "SA", name: "السعودية",           nameEn: "Saudi Arabia",        dialCode: "+966",  sample: "512345678" },
  { iso2: "AE", name: "الإمارات",           nameEn: "UAE",                 dialCode: "+971",  sample: "501234567" },
  { iso2: "KW", name: "الكويت",             nameEn: "Kuwait",              dialCode: "+965",  sample: "51234567" },
  { iso2: "QA", name: "قطر",               nameEn: "Qatar",               dialCode: "+974",  sample: "33123456" },
  { iso2: "BH", name: "البحرين",            nameEn: "Bahrain",             dialCode: "+973",  sample: "36123456" },
  { iso2: "OM", name: "عُمان",              nameEn: "Oman",                dialCode: "+968",  sample: "91234567" },
  { iso2: "JO", name: "الأردن",             nameEn: "Jordan",              dialCode: "+962",  sample: "791234567" },
  { iso2: "LB", name: "لبنان",              nameEn: "Lebanon",             dialCode: "+961",  sample: "71123456" },
  { iso2: "SY", name: "سوريا",              nameEn: "Syria",               dialCode: "+963",  sample: "941234567" },
  { iso2: "IQ", name: "العراق",             nameEn: "Iraq",                dialCode: "+964",  sample: "7901234567" },
  { iso2: "PS", name: "فلسطين",             nameEn: "Palestine",           dialCode: "+970",  sample: "591234567" },
  { iso2: "YE", name: "اليمن",              nameEn: "Yemen",               dialCode: "+967",  sample: "712345678" },
  { iso2: "LY", name: "ليبيا",              nameEn: "Libya",               dialCode: "+218",  sample: "912345678" },
  { iso2: "TN", name: "تونس",              nameEn: "Tunisia",             dialCode: "+216",  sample: "20123456" },
  { iso2: "DZ", name: "الجزائر",            nameEn: "Algeria",             dialCode: "+213",  sample: "551234567" },
  { iso2: "MA", name: "المغرب",             nameEn: "Morocco",             dialCode: "+212",  sample: "612345678" },
  { iso2: "MR", name: "موريتانيا",          nameEn: "Mauritania",          dialCode: "+222",  sample: "22123456" },
  { iso2: "SD", name: "السودان",            nameEn: "Sudan",               dialCode: "+249",  sample: "912345678" },
  { iso2: "SO", name: "الصومال",            nameEn: "Somalia",             dialCode: "+252",  sample: "612345678" },
  { iso2: "DJ", name: "جيبوتي",             nameEn: "Djibouti",            dialCode: "+253",  sample: "77123456" },
  { iso2: "KM", name: "جزر القمر",          nameEn: "Comoros",             dialCode: "+269",  sample: "3212345" },
  // ── Rest of world ───────────────────────────────────────────────
  { iso2: "AF", name: "أفغانستان",          nameEn: "Afghanistan",         dialCode: "+93",   sample: "701234567" },
  { iso2: "AL", name: "ألبانيا",            nameEn: "Albania",             dialCode: "+355",  sample: "661234567" },
  { iso2: "AD", name: "أندورا",             nameEn: "Andorra",             dialCode: "+376",  sample: "312345" },
  { iso2: "AO", name: "أنغولا",             nameEn: "Angola",              dialCode: "+244",  sample: "923456789" },
  { iso2: "AG", name: "أنتيغوا وبربودا",   nameEn: "Antigua & Barbuda",   dialCode: "+1268", sample: "4641234" },
  { iso2: "AR", name: "الأرجنتين",          nameEn: "Argentina",           dialCode: "+54",   sample: "91123456789" },
  { iso2: "AM", name: "أرمينيا",            nameEn: "Armenia",             dialCode: "+374",  sample: "77123456" },
  { iso2: "AU", name: "أستراليا",           nameEn: "Australia",           dialCode: "+61",   sample: "412345678" },
  { iso2: "AT", name: "النمسا",             nameEn: "Austria",             dialCode: "+43",   sample: "664123456" },
  { iso2: "AZ", name: "أذربيجان",           nameEn: "Azerbaijan",          dialCode: "+994",  sample: "501234567" },
  { iso2: "BS", name: "الباهاماس",          nameEn: "Bahamas",             dialCode: "+1242", sample: "3591234" },
  { iso2: "BD", name: "بنغلاديش",           nameEn: "Bangladesh",          dialCode: "+880",  sample: "1812345678" },
  { iso2: "BB", name: "بربادوس",            nameEn: "Barbados",            dialCode: "+1246", sample: "2301234" },
  { iso2: "BY", name: "بيلاروسيا",          nameEn: "Belarus",             dialCode: "+375",  sample: "291234567" },
  { iso2: "BE", name: "بلجيكا",             nameEn: "Belgium",             dialCode: "+32",   sample: "470123456" },
  { iso2: "BZ", name: "بليز",               nameEn: "Belize",              dialCode: "+501",  sample: "6221234" },
  { iso2: "BJ", name: "بنين",               nameEn: "Benin",               dialCode: "+229",  sample: "90123456" },
  { iso2: "BT", name: "بوتان",              nameEn: "Bhutan",              dialCode: "+975",  sample: "17123456" },
  { iso2: "BO", name: "بوليفيا",            nameEn: "Bolivia",             dialCode: "+591",  sample: "71234567" },
  { iso2: "BA", name: "البوسنة والهرسك",   nameEn: "Bosnia & Herzegovina", dialCode: "+387", sample: "61123456" },
  { iso2: "BW", name: "بوتسوانا",           nameEn: "Botswana",            dialCode: "+267",  sample: "71123456" },
  { iso2: "BR", name: "البرازيل",           nameEn: "Brazil",              dialCode: "+55",   sample: "11912345678" },
  { iso2: "BN", name: "بروناي",             nameEn: "Brunei",              dialCode: "+673",  sample: "7123456" },
  { iso2: "BG", name: "بلغاريا",            nameEn: "Bulgaria",            dialCode: "+359",  sample: "87123456" },
  { iso2: "BF", name: "بوركينا فاسو",      nameEn: "Burkina Faso",        dialCode: "+226",  sample: "70123456" },
  { iso2: "BI", name: "بوروندي",            nameEn: "Burundi",             dialCode: "+257",  sample: "79123456" },
  { iso2: "CV", name: "الرأس الأخضر",      nameEn: "Cabo Verde",          dialCode: "+238",  sample: "9911234" },
  { iso2: "KH", name: "كمبوديا",            nameEn: "Cambodia",            dialCode: "+855",  sample: "12345678" },
  { iso2: "CM", name: "الكاميرون",          nameEn: "Cameroon",            dialCode: "+237",  sample: "671234567" },
  { iso2: "CA", name: "كندا",               nameEn: "Canada",              dialCode: "+1",    sample: "4161234567" },
  { iso2: "CF", name: "أفريقيا الوسطى",    nameEn: "Central African Rep.", dialCode: "+236", sample: "75123456" },
  { iso2: "TD", name: "تشاد",               nameEn: "Chad",                dialCode: "+235",  sample: "63123456" },
  { iso2: "CL", name: "تشيلي",              nameEn: "Chile",               dialCode: "+56",   sample: "912345678" },
  { iso2: "CN", name: "الصين",              nameEn: "China",               dialCode: "+86",   sample: "13912345678" },
  { iso2: "CO", name: "كولومبيا",           nameEn: "Colombia",            dialCode: "+57",   sample: "3001234567" },
  { iso2: "CG", name: "الكونغو",            nameEn: "Congo",               dialCode: "+242",  sample: "061234567" },
  { iso2: "CD", name: "الكونغو الديمقراطية", nameEn: "Congo (DRC)",       dialCode: "+243",  sample: "812345678" },
  { iso2: "CR", name: "كوستاريكا",          nameEn: "Costa Rica",          dialCode: "+506",  sample: "83123456" },
  { iso2: "HR", name: "كرواتيا",            nameEn: "Croatia",             dialCode: "+385",  sample: "912345678" },
  { iso2: "CU", name: "كوبا",               nameEn: "Cuba",                dialCode: "+53",   sample: "51234567" },
  { iso2: "CY", name: "قبرص",               nameEn: "Cyprus",              dialCode: "+357",  sample: "96123456" },
  { iso2: "CZ", name: "التشيك",             nameEn: "Czech Republic",      dialCode: "+420",  sample: "601234567" },
  { iso2: "DK", name: "الدنمارك",           nameEn: "Denmark",             dialCode: "+45",   sample: "20123456" },
  { iso2: "DO", name: "الدومينيكان",        nameEn: "Dominican Republic",  dialCode: "+1809", sample: "2345678" },
  { iso2: "EC", name: "الإكوادور",          nameEn: "Ecuador",             dialCode: "+593",  sample: "991234567" },
  { iso2: "SV", name: "السلفادور",          nameEn: "El Salvador",         dialCode: "+503",  sample: "70123456" },
  { iso2: "GQ", name: "غينيا الاستوائية",  nameEn: "Equatorial Guinea",   dialCode: "+240",  sample: "222123456" },
  { iso2: "ER", name: "إريتريا",            nameEn: "Eritrea",             dialCode: "+291",  sample: "7123456" },
  { iso2: "EE", name: "إستونيا",            nameEn: "Estonia",             dialCode: "+372",  sample: "51234567" },
  { iso2: "SZ", name: "إسواتيني",           nameEn: "Eswatini",            dialCode: "+268",  sample: "76123456" },
  { iso2: "ET", name: "إثيوبيا",            nameEn: "Ethiopia",            dialCode: "+251",  sample: "911234567" },
  { iso2: "FJ", name: "فيجي",               nameEn: "Fiji",                dialCode: "+679",  sample: "7012345" },
  { iso2: "FI", name: "فنلندا",             nameEn: "Finland",             dialCode: "+358",  sample: "412345678" },
  { iso2: "FR", name: "فرنسا",              nameEn: "France",              dialCode: "+33",   sample: "612345678" },
  { iso2: "GA", name: "الغابون",            nameEn: "Gabon",               dialCode: "+241",  sample: "06123456" },
  { iso2: "GM", name: "غامبيا",             nameEn: "Gambia",              dialCode: "+220",  sample: "3012345" },
  { iso2: "GE", name: "جورجيا",             nameEn: "Georgia",             dialCode: "+995",  sample: "555123456" },
  { iso2: "DE", name: "ألمانيا",            nameEn: "Germany",             dialCode: "+49",   sample: "15123456789" },
  { iso2: "GH", name: "غانا",               nameEn: "Ghana",               dialCode: "+233",  sample: "231234567" },
  { iso2: "GR", name: "اليونان",            nameEn: "Greece",              dialCode: "+30",   sample: "6912345678" },
  { iso2: "GT", name: "غواتيمالا",          nameEn: "Guatemala",           dialCode: "+502",  sample: "51234567" },
  { iso2: "GN", name: "غينيا",              nameEn: "Guinea",              dialCode: "+224",  sample: "601234567" },
  { iso2: "GW", name: "غينيا بيساو",       nameEn: "Guinea-Bissau",       dialCode: "+245",  sample: "5512345" },
  { iso2: "GY", name: "غيانا",              nameEn: "Guyana",              dialCode: "+592",  sample: "6091234" },
  { iso2: "HT", name: "هايتي",              nameEn: "Haiti",               dialCode: "+509",  sample: "34101234" },
  { iso2: "HN", name: "هندوراس",            nameEn: "Honduras",            dialCode: "+504",  sample: "91234567" },
  { iso2: "HK", name: "هونغ كونغ",         nameEn: "Hong Kong",           dialCode: "+852",  sample: "51234567" },
  { iso2: "HU", name: "المجر",              nameEn: "Hungary",             dialCode: "+36",   sample: "201234567" },
  { iso2: "IS", name: "آيسلندا",            nameEn: "Iceland",             dialCode: "+354",  sample: "6111234" },
  { iso2: "IN", name: "الهند",              nameEn: "India",               dialCode: "+91",   sample: "9123456789" },
  { iso2: "ID", name: "إندونيسيا",          nameEn: "Indonesia",           dialCode: "+62",   sample: "81234567890" },
  { iso2: "IR", name: "إيران",              nameEn: "Iran",                dialCode: "+98",   sample: "9123456789" },
  { iso2: "IE", name: "أيرلندا",            nameEn: "Ireland",             dialCode: "+353",  sample: "851234567" },
  { iso2: "IL", name: "إسرائيل",            nameEn: "Israel",              dialCode: "+972",  sample: "521234567" },
  { iso2: "IT", name: "إيطاليا",            nameEn: "Italy",               dialCode: "+39",   sample: "3121234567" },
  { iso2: "JM", name: "جامايكا",            nameEn: "Jamaica",             dialCode: "+1876", sample: "2101234" },
  { iso2: "JP", name: "اليابان",            nameEn: "Japan",               dialCode: "+81",   sample: "9012345678" },
  { iso2: "KZ", name: "كازاخستان",          nameEn: "Kazakhstan",          dialCode: "+7",    sample: "7011234567" },
  { iso2: "KE", name: "كينيا",              nameEn: "Kenya",               dialCode: "+254",  sample: "712345678" },
  { iso2: "KI", name: "كيريباتي",           nameEn: "Kiribati",            dialCode: "+686",  sample: "72012345" },
  { iso2: "KP", name: "كوريا الشمالية",    nameEn: "Korea (North)",       dialCode: "+850",  sample: "1921234567" },
  { iso2: "KR", name: "كوريا الجنوبية",    nameEn: "Korea (South)",       dialCode: "+82",   sample: "1012345678" },
  { iso2: "XK", name: "كوسوفو",             nameEn: "Kosovo",              dialCode: "+383",  sample: "44123456" },
  { iso2: "KG", name: "قيرغيزستان",        nameEn: "Kyrgyzstan",          dialCode: "+996",  sample: "700123456" },
  { iso2: "LA", name: "لاوس",               nameEn: "Laos",                dialCode: "+856",  sample: "2012345678" },
  { iso2: "LV", name: "لاتفيا",             nameEn: "Latvia",              dialCode: "+371",  sample: "21234567" },
  { iso2: "LS", name: "ليسوتو",             nameEn: "Lesotho",             dialCode: "+266",  sample: "50123456" },
  { iso2: "LR", name: "ليبيريا",            nameEn: "Liberia",             dialCode: "+231",  sample: "770123456" },
  { iso2: "LI", name: "ليختنشتاين",        nameEn: "Liechtenstein",       dialCode: "+423",  sample: "660234567" },
  { iso2: "LT", name: "ليتوانيا",           nameEn: "Lithuania",           dialCode: "+370",  sample: "61234567" },
  { iso2: "LU", name: "لوكسمبورغ",          nameEn: "Luxembourg",          dialCode: "+352",  sample: "628123456" },
  { iso2: "MO", name: "ماكاو",              nameEn: "Macao",               dialCode: "+853",  sample: "66123456" },
  { iso2: "MG", name: "مدغشقر",             nameEn: "Madagascar",          dialCode: "+261",  sample: "321234567" },
  { iso2: "MW", name: "ملاوي",              nameEn: "Malawi",              dialCode: "+265",  sample: "991234567" },
  { iso2: "MY", name: "ماليزيا",            nameEn: "Malaysia",            dialCode: "+60",   sample: "123456789" },
  { iso2: "MV", name: "المالديف",           nameEn: "Maldives",            dialCode: "+960",  sample: "7512345" },
  { iso2: "ML", name: "مالي",               nameEn: "Mali",                dialCode: "+223",  sample: "65123456" },
  { iso2: "MT", name: "مالطا",              nameEn: "Malta",               dialCode: "+356",  sample: "99123456" },
  { iso2: "MH", name: "جزر مارشال",        nameEn: "Marshall Islands",    dialCode: "+692",  sample: "2351234" },
  { iso2: "MX", name: "المكسيك",            nameEn: "Mexico",              dialCode: "+52",   sample: "2221234567" },
  { iso2: "FM", name: "ميكرونيزيا",        nameEn: "Micronesia",          dialCode: "+691",  sample: "3201234" },
  { iso2: "MD", name: "مولدوفا",            nameEn: "Moldova",             dialCode: "+373",  sample: "69212345" },
  { iso2: "MC", name: "موناكو",             nameEn: "Monaco",              dialCode: "+377",  sample: "612345678" },
  { iso2: "MN", name: "منغوليا",            nameEn: "Mongolia",            dialCode: "+976",  sample: "88123456" },
  { iso2: "ME", name: "الجبل الأسود",      nameEn: "Montenegro",          dialCode: "+382",  sample: "67123456" },
  { iso2: "MZ", name: "موزمبيق",            nameEn: "Mozambique",          dialCode: "+258",  sample: "821234567" },
  { iso2: "MM", name: "ميانمار",            nameEn: "Myanmar",             dialCode: "+95",   sample: "9212345678" },
  { iso2: "NA", name: "ناميبيا",            nameEn: "Namibia",             dialCode: "+264",  sample: "811234567" },
  { iso2: "NR", name: "ناورو",              nameEn: "Nauru",               dialCode: "+674",  sample: "5551234" },
  { iso2: "NP", name: "نيبال",              nameEn: "Nepal",               dialCode: "+977",  sample: "9812345678" },
  { iso2: "NL", name: "هولندا",             nameEn: "Netherlands",         dialCode: "+31",   sample: "612345678" },
  { iso2: "NZ", name: "نيوزيلندا",          nameEn: "New Zealand",         dialCode: "+64",   sample: "211234567" },
  { iso2: "NI", name: "نيكاراغوا",          nameEn: "Nicaragua",           dialCode: "+505",  sample: "81234567" },
  { iso2: "NE", name: "النيجر",             nameEn: "Niger",               dialCode: "+227",  sample: "93123456" },
  { iso2: "NG", name: "نيجيريا",            nameEn: "Nigeria",             dialCode: "+234",  sample: "8012345678" },
  { iso2: "MK", name: "مقدونيا الشمالية",  nameEn: "North Macedonia",     dialCode: "+389",  sample: "72345678" },
  { iso2: "NO", name: "النرويج",            nameEn: "Norway",              dialCode: "+47",   sample: "41234567" },
  { iso2: "PK", name: "باكستان",            nameEn: "Pakistan",            dialCode: "+92",   sample: "3012345678" },
  { iso2: "PW", name: "بالاو",              nameEn: "Palau",               dialCode: "+680",  sample: "7701234" },
  { iso2: "PA", name: "بنما",               nameEn: "Panama",              dialCode: "+507",  sample: "61234567" },
  { iso2: "PG", name: "بابوا غينيا الجديدة", nameEn: "Papua New Guinea",  dialCode: "+675",  sample: "70123456" },
  { iso2: "PY", name: "باراغواي",           nameEn: "Paraguay",            dialCode: "+595",  sample: "961234567" },
  { iso2: "PE", name: "بيرو",               nameEn: "Peru",                dialCode: "+51",   sample: "912345678" },
  { iso2: "PH", name: "الفلبين",            nameEn: "Philippines",         dialCode: "+63",   sample: "9171234567" },
  { iso2: "PL", name: "بولندا",             nameEn: "Poland",              dialCode: "+48",   sample: "512345678" },
  { iso2: "PT", name: "البرتغال",           nameEn: "Portugal",            dialCode: "+351",  sample: "912345678" },
  { iso2: "RO", name: "رومانيا",            nameEn: "Romania",             dialCode: "+40",   sample: "712345678" },
  { iso2: "RU", name: "روسيا",              nameEn: "Russia",              dialCode: "+7",    sample: "9123456789" },
  { iso2: "RW", name: "رواندا",             nameEn: "Rwanda",              dialCode: "+250",  sample: "720123456" },
  { iso2: "KN", name: "سانت كيتس ونيفيس", nameEn: "Saint Kitts & Nevis", dialCode: "+1869", sample: "5651234" },
  { iso2: "LC", name: "سانت لوسيا",        nameEn: "Saint Lucia",         dialCode: "+1758", sample: "2841234" },
  { iso2: "VC", name: "سانت فنسنت",        nameEn: "Saint Vincent",       dialCode: "+1784", sample: "4301234" },
  { iso2: "WS", name: "ساموا",              nameEn: "Samoa",               dialCode: "+685",  sample: "7212345" },
  { iso2: "SM", name: "سان مارينو",        nameEn: "San Marino",          dialCode: "+378",  sample: "661234567" },
  { iso2: "ST", name: "ساو تومي وبرينسيبي", nameEn: "São Tomé & Príncipe", dialCode: "+239", sample: "9812345" },
  { iso2: "SN", name: "السنغال",            nameEn: "Senegal",             dialCode: "+221",  sample: "701234567" },
  { iso2: "RS", name: "صربيا",              nameEn: "Serbia",              dialCode: "+381",  sample: "601234567" },
  { iso2: "SC", name: "سيشيل",             nameEn: "Seychelles",          dialCode: "+248",  sample: "2512345" },
  { iso2: "SL", name: "سيراليون",           nameEn: "Sierra Leone",        dialCode: "+232",  sample: "25123456" },
  { iso2: "SG", name: "سنغافورة",           nameEn: "Singapore",           dialCode: "+65",   sample: "81234567" },
  { iso2: "SK", name: "سلوفاكيا",           nameEn: "Slovakia",            dialCode: "+421",  sample: "912345678" },
  { iso2: "SI", name: "سلوفينيا",           nameEn: "Slovenia",            dialCode: "+386",  sample: "31234567" },
  { iso2: "SB", name: "جزر سليمان",        nameEn: "Solomon Islands",     dialCode: "+677",  sample: "7412345" },
  { iso2: "ZA", name: "جنوب أفريقيا",      nameEn: "South Africa",        dialCode: "+27",   sample: "711234567" },
  { iso2: "SS", name: "جنوب السودان",      nameEn: "South Sudan",         dialCode: "+211",  sample: "912345678" },
  { iso2: "ES", name: "إسبانيا",            nameEn: "Spain",               dialCode: "+34",   sample: "612345678" },
  { iso2: "LK", name: "سريلانكا",           nameEn: "Sri Lanka",           dialCode: "+94",   sample: "712345678" },
  { iso2: "SR", name: "سورينام",            nameEn: "Suriname",            dialCode: "+597",  sample: "7412345" },
  { iso2: "SE", name: "السويد",             nameEn: "Sweden",              dialCode: "+46",   sample: "701234567" },
  { iso2: "CH", name: "سويسرا",             nameEn: "Switzerland",         dialCode: "+41",   sample: "791234567" },
  { iso2: "TW", name: "تايوان",             nameEn: "Taiwan",              dialCode: "+886",  sample: "912345678" },
  { iso2: "TJ", name: "طاجيكستان",          nameEn: "Tajikistan",          dialCode: "+992",  sample: "917123456" },
  { iso2: "TZ", name: "تنزانيا",            nameEn: "Tanzania",            dialCode: "+255",  sample: "621234567" },
  { iso2: "TH", name: "تايلاند",            nameEn: "Thailand",            dialCode: "+66",   sample: "812345678" },
  { iso2: "TL", name: "تيمور الشرقية",     nameEn: "Timor-Leste",         dialCode: "+670",  sample: "77212345" },
  { iso2: "TG", name: "توغو",               nameEn: "Togo",                dialCode: "+228",  sample: "90123456" },
  { iso2: "TO", name: "تونغا",              nameEn: "Tonga",               dialCode: "+676",  sample: "7715123" },
  { iso2: "TT", name: "ترينيداد وتوباغو",  nameEn: "Trinidad & Tobago",   dialCode: "+1868", sample: "2911234" },
  { iso2: "TR", name: "تركيا",              nameEn: "Turkey",              dialCode: "+90",   sample: "5321234567" },
  { iso2: "TM", name: "تركمانستان",         nameEn: "Turkmenistan",        dialCode: "+993",  sample: "65123456" },
  { iso2: "TV", name: "توفالو",             nameEn: "Tuvalu",              dialCode: "+688",  sample: "901234" },
  { iso2: "UG", name: "أوغندا",             nameEn: "Uganda",              dialCode: "+256",  sample: "712345678" },
  { iso2: "UA", name: "أوكرانيا",           nameEn: "Ukraine",             dialCode: "+380",  sample: "671234567" },
  { iso2: "GB", name: "المملكة المتحدة",   nameEn: "United Kingdom",      dialCode: "+44",   sample: "7911123456" },
  { iso2: "US", name: "الولايات المتحدة",  nameEn: "United States",       dialCode: "+1",    sample: "2025551234" },
  { iso2: "UY", name: "أوروغواي",           nameEn: "Uruguay",             dialCode: "+598",  sample: "94231234" },
  { iso2: "UZ", name: "أوزبكستان",          nameEn: "Uzbekistan",          dialCode: "+998",  sample: "901234567" },
  { iso2: "VU", name: "فانواتو",            nameEn: "Vanuatu",             dialCode: "+678",  sample: "5912345" },
  { iso2: "VE", name: "فنزويلا",            nameEn: "Venezuela",           dialCode: "+58",   sample: "4121234567" },
  { iso2: "VN", name: "فيتنام",             nameEn: "Vietnam",             dialCode: "+84",   sample: "912345678" },
  { iso2: "ZM", name: "زامبيا",             nameEn: "Zambia",              dialCode: "+260",  sample: "955123456" },
  { iso2: "ZW", name: "زيمبابوي",           nameEn: "Zimbabwe",            dialCode: "+263",  sample: "712345678" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export function findCountry(iso2: string): Country {
  return COUNTRIES.find((c) => c.iso2 === iso2) ?? DEFAULT_COUNTRY;
}

export function applyCountryCode(text: string, dialCode: string): string {
  const digits = dialCode.replace("+", "");
  const lines = text.split(/\n/);
  const result = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    let num = trimmed.replace(/[\s+\-().]/g, "");
    if (num.startsWith(digits)) return num;
    if (num.startsWith("0")) num = num.slice(1);
    return digits + num;
  });
  return result.join("\n");
}

export function parseRawNumbers(text: string, dialCode: string): string[] {
  const digits = dialCode.replace("+", "");
  return text
    .split(/[\n,،;\s]+/)
    .map((p) => {
      let num = p.trim().replace(/[\s+\-()]/g, "");
      if (!num) return "";
      if (num.startsWith(digits)) return num;
      if (num.startsWith("0")) num = num.slice(1);
      return digits + num;
    })
    .filter((p) => p.length >= 9);
}
