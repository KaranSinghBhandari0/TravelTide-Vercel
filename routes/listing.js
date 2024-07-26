const express = require('express');
const router = express.Router({mergeParams:true});
const wrapAsync = require("../utils/wrapAsync");
const Listing = require('../models/listing.js');
const {isLoggedIn} = require('../middlewares.js');
const {isOwner} = require('../middlewares.js');
const multer  = require('multer');
const {storage} = require('../cloudConfig.js');
const upload = multer({storage});

// home page
router.get("/", wrapAsync (async (req,res)=> {
    let allListings = await Listing.find({});
    res.render("listings/index.ejs", {allListings});
}))

// create new listing
router.get("/new", isLoggedIn, (req,res)=> {
    res.render("listings/new.ejs");
})

router.post("/", isLoggedIn, upload.single('image'), wrapAsync ( async (req,res,next) => {
    let url = req.file.path;
    let filename = req.file.filename;

    let newListing = new Listing({
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        location: req.body.location,
        country: req.body.country,
    });

    newListing.owner = req.user._id;
    newListing.image = {url,filename};

    await newListing.save();
    console.log("sample was saved");
    req.flash('success','new listing created successfully');

    res.redirect("/listings");   
}))

// show listing
router.get("/:id", wrapAsync (async (req,res)=> {
    let {id} = req.params;
    let listing =  await Listing.findById(id).populate({path: "reviews", populate: {path:"author"},}).populate("owner");

    if(!listing) {
        req.flash("error", "listing does not exist");
        res.redirect('/listings');
    } else {
        res.render("listings/show.ejs", {listing}); 
    }
}))

// update listing
router.get("/:id/update", isLoggedIn, isOwner,  wrapAsync (async (req,res)=> {
    let {id} = req.params;
    let listing =  await Listing.findById(id);

    if(!listing) {
        req.flash("error", "listing does not exist");
        res.redirect('/listings');
    } else {
        res.render("listings/edit.ejs", {listing}); 
    }
}))

router.patch("/:id", isLoggedIn, isOwner, upload.single('image'), wrapAsync (async (req,res)=> {
    let {id} = req.params;
    let {title, description, price, location, country, image} = req.body;

    let updatedListing = await Listing.findByIdAndUpdate(id, {title:title, description:description, price: price, location: location, country: country, image:image});
    
    if(typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        updatedListing.image = {url,filename};
        await updatedListing.save();
    }

    req.flash('success','listing updated successfully');
    res.redirect(`/listings/${id}`);
}))

// Delete listing
router.delete("/:id", isLoggedIn,isOwner, wrapAsync (async (req,res)=> {
    let {id} = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash('success','listing deleted successfully');
    res.redirect("/listings");
}))

router.get("/:id/reviews", wrapAsync (async (req,res)=> {
    let {id} = req.params;
    res.redirect(`/listings/${id}`);
}))


// search by country
router.post("/search", wrapAsync (async (req,res)=> {
    let {country} = req.body;
    country = country.trim();      // trim function to remove leading zeroes

    // regex for case sensitive Input 
    const searchPatterns = [
        { country: { $regex: new RegExp(`^${country}$`, 'i') } },
        { location: { $regex: new RegExp(`^${country}\\s*$`, 'i') } },
    ];

    let allListings = await Listing.find({ $or: searchPatterns });

    // agar Country nahi Milti
    if(allListings.length === 0) {
        req.flash('error', `No destination found in ${country}`);
        return res.redirect("/listings");
    }

    res.render("listings/searchResults.ejs" , {allListings});
}))


// listing payment page 
router.get("/:id/payment", isLoggedIn, wrapAsync (async (req,res)=> {
    let {id} = req.params;
    let currListing = await Listing.findById(id);

    if(req.user._id.equals(currListing.owner._id)) {
        req.flash('error', 'You are listing Owner this is Your place');
        return res.redirect('/listings');
    }

    res.render("listings/paymentpage.ejs", {currListing, quantity:req.query.quantity});
}))

// payment done page
router.get("/:id/paymentdone/:tickets", isLoggedIn, wrapAsync (async (req,res)=> {
    let {id,tickets} = req.params;
    let currListing = await Listing.findById(id);

    setTimeout(() => {
        res.render("listings/receipt.ejs", {currListing, tickets, time:new Date()});
    }, 3000);
    
}))


module.exports = router;