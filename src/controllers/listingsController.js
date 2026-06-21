const spark = require('../lib/spark');
const { VALID_CITY_SLUGS, CITY_SLUG_MAP } = spark;

async function fetchListings(req, res, listingType) {
  try {
    const { page = 1, limit = 20, minPrice, maxPrice, beds, baths, city, propertyType, sortBy } = req.query;

    if (city && !VALID_CITY_SLUGS.includes(city.toLowerCase())) {
      return res.status(400).json({
        error: `Invalid city. Supported values: ${VALID_CITY_SLUGS.join(', ')}`,
      });
    }

    const data = await spark.getListings({ page, limit, minPrice, maxPrice, beds, baths, city, propertyType, listingType, sortBy });
    res.json({
      listings: data.value || [],
      total: data['@odata.count'] || 0,
      page: Number(page),
      limit: Number(limit),
      ...(listingType && { type: listingType }),
    });
  } catch (err) {
    console.error('[listingsController] getListings:', err.message);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
}

async function getListings(req, res)         { return fetchListings(req, res, null); }
async function getSaleListings(req, res)     { return fetchListings(req, res, 'sale'); }
async function getRentListings(req, res)     { return fetchListings(req, res, 'rent'); }
async function getFilteredListings(req, res) { return fetchListings(req, res, req.query.type || null); }

async function getListing(req, res) {
  try {
    const { listingKey } = req.params;
    const data = await spark.getListing(listingKey);
    res.json(data);
  } catch (err) {
    console.error('[listingsController] getListing:', err.message);
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
}

async function getListingPhotos(req, res) {
  try {
    const { listingKey } = req.params;
    const data = await spark.getListingPhotos(listingKey);
    res.json({ photos: data.value || [] });
  } catch (err) {
    console.error('[listingsController] getListingPhotos:', err.message);
    if (err.response?.status === 404) {
      return res.json({ photos: [] });
    }
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
}

async function getTopAreaListings(req, res) {
  try {
    const { city } = req.params;
    const { page = 1, limit = 20, minPrice, maxPrice, beds, baths, type, sortBy } = req.query;

    const slug = city.toLowerCase();
    if (!CITY_SLUG_MAP[slug]) {
      return res.status(400).json({
        error: `Invalid city. Supported values: ${Object.keys(CITY_SLUG_MAP).filter(k => !k.includes(' ')).join(', ')}`,
      });
    }

    const data = await spark.getListings({
      page, limit, minPrice, maxPrice, beds, baths,
      city: slug,
      listingType: type || null,
      sortBy,
    });

    res.json({
      city: CITY_SLUG_MAP[slug],
      listings: data.value || [],
      total: data['@odata.count'] || 0,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    console.error('[listingsController] getTopAreaListings:', err.message);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
}

module.exports = { getListings, getSaleListings, getRentListings, getFilteredListings, getListing, getListingPhotos, getTopAreaListings };
