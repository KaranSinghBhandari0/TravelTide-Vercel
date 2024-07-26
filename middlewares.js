module.exports.isLoggedIn = (req,res,next) => {
    // agar user logged in nahi hai toh
    if(!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        req.flash('error', 'Please login to continue');
        return res.redirect("/account/login");
    }
    next();
}

// redirect to page we want to access without login
module.exports.saveRedirectUrl = (req,res,next) => {
    if(req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
}


const Listing = require('./models/listing.js');
// listing ka owner hi listing edit/delete kar sakta hai
module.exports.isOwner = async (req,res,next) => {
    let {id} = req.params;
    let listing =  await Listing.findById(id);

    if(!res.locals.currUser._id.equals(listing.owner._id)) {
        req.flash("error", "You don't have permission to edit this listing");
        return res.redirect(`/listings/${id}`);
    }
    next();
}