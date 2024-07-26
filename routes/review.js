const express = require('express');
const router = express.Router({mergeParams:true});
const wrapAsync = require("../utils/wrapAsync");
const Listing = require('../models/listing.js');
const Review = require('../models/reviews.js');
const {isLoggedIn} = require('../middlewares.js');

// add a review
router.post("/", isLoggedIn, wrapAsync (async (req,res)=> {
    let {id} = req.params;
    let listing = await Listing.findById(id);
    let newReview = new Review(req.body);
    newReview.author = req.user._id;

    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();

    console.log("new review saved");
    req.flash('success','review added successfully');
    res.redirect(`/listings/${id}`);
}))

// delete review
router.delete("/:reviewID", wrapAsync (async (req,res)=> {
    let {id,reviewID} = req.params;

    // review del karne se listing mai review del nahi hoga 
    await Listing.findByIdAndUpdate(id, {$pull: {reviews:reviewID}});   // isliye ye likha hai

    await Review.findByIdAndDelete(reviewID);
    req.flash('success','review deleted successfully');
    res.redirect(`/listings/${id}`);
}))

module.exports = router;