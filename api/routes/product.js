const mongoose = require("mongoose");

const productSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    title: String,
    title_ru: String,
    Description: String,
    Description_ru: String,
    images: String,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    deleted_at: { type: Date, default: null },
});

module.exports = mongoose.model("Product", productSchema);
