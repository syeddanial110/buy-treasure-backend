const express = require('express');
const router = express.Router();
const { getListings, getSaleListings, getRentListings, getListing, getListingPhotos } = require('../controllers/listingsController');

router.get('/', getListings);
router.get('/sale', getSaleListings);
router.get('/rent', getRentListings);
router.get('/:listingKey/photos', getListingPhotos);
router.get('/:listingKey', getListing);

module.exports = router;
