const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    title: String,
    description: String,
    location: String,
    lat: Number,
    lng: Number,
    image: String,

    category: String,
    priority: String,
    votes: {
        type: Number,
        default: 0,
    },

    status: {
        type: String,
        default: "Pending"
    }

}, { timestamps: true });

module.exports = mongoose.model("Complaint", complaintSchema);