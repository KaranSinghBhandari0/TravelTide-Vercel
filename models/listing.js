const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  image: {
    url: String,
    filename: String,
  },
  price: {
    type: Number,
    required: true,
    min: [0, "price cannot be negative"],
  },
  location: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    }
  ],
  owner :{
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});


// post del karne se review del ho jaye
const Review = require('./reviews.js');
listingSchema.post("findOneAndDelete", async (listing) => {
  await Review.deleteMany({_id: {$in: listing.reviews}});
})

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;