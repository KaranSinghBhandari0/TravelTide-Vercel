const express = require('express');
const router = express.Router({ mergeParams: true });
const wrapAsync = require('../utils/wrapAsync');
const Listing = require('../models/listing.js');
const { isLoggedIn, isOwner } = require('../middlewares');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

// Multer memory storage for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Home page (list all listings)
router.get('/', wrapAsync(async (req, res) => {
    const allListings = await Listing.find({});
    res.render('listings/index.ejs', { allListings });
}));

// Create new listing form
router.get('/new', isLoggedIn, (req, res) => {
    res.render('listings/new.ejs');
});

// Post route to create a new listing
router.post('/', isLoggedIn, upload.array('images'), wrapAsync(async (req, res, next) => {
    const { title, description, price, location, country } = req.body;
    const files = req.files;

    // Helper function to upload to Cloudinary
    const uploadToCloudinary = (file) => {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({ folder: 'TravelTide' }, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }).end(file.buffer);
        });
    };

    // Upload images to Cloudinary and save URLs
    const uploadPromises = files.map(uploadToCloudinary);
    const cloudinaryResults = await Promise.all(uploadPromises);

    const images = cloudinaryResults.map(result => ({
        url: result.secure_url,
        filename: result.public_id,
    }));

    const newListing = new Listing({
        title,
        description,
        price,
        location,
        country,
        images,
        owner: req.user._id,
    });

    await newListing.save();
    req.flash('success', 'New listing created successfully');
    res.redirect('/listings');
}));

// Show listing details
router.get('/:id', wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({ path: 'reviews', populate: { path: 'author' } })
        .populate('owner');

    if (!listing) {
        req.flash('error', 'Listing does not exist');
        return res.redirect('/listings');
    }

    res.render('listings/show.ejs', { listing });
}));

// Update listing form
router.get('/:id/update', isLoggedIn, isOwner, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash('error', 'Listing does not exist');
        return res.redirect('/listings');
    }

    res.render('listings/edit.ejs', { listing });
}));

// Patch route to update listing
router.patch('/:id', isLoggedIn, isOwner, upload.array('images'), wrapAsync(async (req, res) => {
    const { id } = req.params;
    const { title, description, price, location, country } = req.body;

    // Find the existing listing
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash('error', 'Listing does not exist');
        return res.redirect('/listings');
    }

    const files = req.files;
    let newImages = [];

    // Helper function to upload to Cloudinary
    const uploadToCloudinary = (file) => {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({ folder: 'TravelTide' }, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }).end(file.buffer);
        });
    };

    // If new images are uploaded, process them
    if (files && files.length > 0) {
        const uploadPromises = files.map(uploadToCloudinary);
        const cloudinaryResults = await Promise.all(uploadPromises);

        newImages = cloudinaryResults.map(result => ({
            url: result.secure_url,
            filename: result.public_id,
        }));
    }

    // Merge existing images with new ones (if any)
    const updatedImages = [...listing.images, ...newImages];

    // Update listing with new data and images
    listing.title = title;
    listing.description = description;
    listing.price = price;
    listing.location = location;
    listing.country = country;
    if (newImages.length > 0) {
        listing.images = updatedImages;
    }

    await listing.save();

    req.flash('success', 'Listing updated successfully');
    res.redirect(`/listings/${id}`);
}));


// Delete listing
router.delete('/:id', isLoggedIn, isOwner, wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash('success', 'Listing deleted successfully');
    res.redirect('/listings');
}));

// Search listings by country
router.post('/search', wrapAsync(async (req, res) => {
    const country = req.body.country.trim();
    const searchPatterns = [
        { country: { $regex: new RegExp(`^${country}$`, 'i') } },
        { location: { $regex: new RegExp(`^${country}\\s*$`, 'i') } },
    ];

    const allListings = await Listing.find({ $or: searchPatterns });

    if (!allListings.length) {
        req.flash('error', `No destination found in ${country}`);
        return res.redirect('/listings');
    }

    res.render('listings/searchResults.ejs', { allListings });
}));

// Payment page for a listing
router.get('/:id/payment', isLoggedIn, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (req.user._id.equals(listing.owner._id)) {
        req.flash('error', 'You are the owner of this listing');
        return res.redirect('/listings');
    }

    res.render('listings/paymentpage.ejs', { listing, quantity: req.query.quantity });
}));

// Payment done page
router.get('/:id/paymentdone/:tickets', isLoggedIn, wrapAsync(async (req, res) => {
    const { id, tickets } = req.params;
    const listing = await Listing.findById(id);

    // Simulate a delay before showing the receipt
    setTimeout(() => {
        res.render('listings/receipt.ejs', { listing, tickets, time: new Date() });
    }, 3000);
}));

module.exports = router;
