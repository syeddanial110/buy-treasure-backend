const axios = require('axios');

const BASE_URL = 'https://replication.sparkapi.com/Version/3/Reso/OData';

const escOData = (s) => String(s).replace(/'/g, "''");

// All supported Treasure Coast cities
const TREASURE_COAST_CITIES = [
  'Port St. Lucie',
  'Stuart',
  'Jupiter',
  'Fort Pierce',
  'Vero Beach',
  'Sebastian',
];

// Slug → exact MLS city name (handles URL-friendly params like ?city=port-st-lucie)
const CITY_SLUG_MAP = {
  'port-st-lucie':  'Port St. Lucie',
  'port st. lucie': 'Port St. Lucie',
  'stuart':         'Stuart',
  'jupiter':        'Jupiter',
  'fort-pierce':    'Fort Pierce',
  'fort pierce':    'Fort Pierce',
  'vero-beach':     'Vero Beach',
  'vero beach':     'Vero Beach',
  'sebastian':      'Sebastian',
};

function resolveCity(city) {
  if (!city) return null;
  return CITY_SLUG_MAP[city.toLowerCase()] || city;
}

function sparkHeaders() {
  return {
    Authorization: `Bearer ${process.env.SPARK_ACCESS_TOKEN}`,
    Accept: 'application/json',
  };
}

async function getListings({ page = 1, limit = 20, minPrice, maxPrice, beds, baths, city, propertyType, listingType } = {}) {
  const top  = Math.min(Math.max(Number(limit) || 1, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * top;

  const filters = ["StandardStatus eq 'Active'"];
  if (minPrice)       filters.push(`ListPrice ge ${Number(minPrice)}`);
  if (maxPrice)       filters.push(`ListPrice le ${Number(maxPrice)}`);
  if (beds)           filters.push(`BedroomsTotal ge ${Number(beds)}`);
  if (baths)          filters.push(`BathroomsTotalInteger ge ${Number(baths)}`);
  const resolvedCity = resolveCity(city);
  if (resolvedCity) {
    filters.push(`City eq '${escOData(resolvedCity)}'`);
  } else {
    // Default: restrict to Treasure Coast area only
    const cityFilter = TREASURE_COAST_CITIES.map(c => `City eq '${c}'`).join(' or ');
    filters.push(`(${cityFilter})`);
  }
  if (propertyType)   filters.push(`PropertyType eq '${escOData(propertyType)}'`);
  if (listingType === 'rent') filters.push("PropertyType eq 'Residential Lease'");
  if (listingType === 'sale') filters.push("PropertyType ne 'Residential Lease'");

  const response = await axios.get(`${BASE_URL}/Property`, {
    headers: sparkHeaders(),
    params: {
      $top: top,
      $skip: skip,
      $filter: filters.join(' and '),
      $orderby: 'ListingContractDate desc',
      $count: true,
      $expand: 'Media($top=4)',
    },
  });

  return response.data;
}

async function getListing(listingKey) {
  const response = await axios.get(`${BASE_URL}/Property('${escOData(listingKey)}')`, {
    headers: sparkHeaders(),
  });
  return response.data;
}

async function getListingPhotos(listingKey) {
  try {
    // Try dedicated Media endpoint first
    const response = await axios.get(`${BASE_URL}/Media`, {
      headers: sparkHeaders(),
      params: {
        $filter: `ResourceRecordKey eq '${escOData(listingKey)}'`,
        $top: 100,
      },
    });
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) {
      // Media endpoint not available for this token — fall back to $expand on Property
      const response = await axios.get(`${BASE_URL}/Property('${escOData(listingKey)}')`, {
        headers: sparkHeaders(),
        params: { $expand: 'Media' },
      });
      const media = response.data?.Media || response.data?.value?.[0]?.Media || [];
      return { value: Array.isArray(media) ? media : [] };
    }
    console.error('[spark] getListingPhotos raw error:', err.response?.status, JSON.stringify(err.response?.data));
    throw err;
  }
}

module.exports = { getListings, getListing, getListingPhotos };
