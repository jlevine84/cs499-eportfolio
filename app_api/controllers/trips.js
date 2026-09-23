// Reqs and var init
const mongoose = require("mongoose");
require("../models/trip"); // Ensures schema is loaded into Mongoose memory
require("../models/log");  // Ensures audit log schema is loaded
const Model = mongoose.model("trips"); // Unified model reference for all CRUD operations
const Log = mongoose.model("logs");   // Audit log model reference

// GET endpoint: /trips - Get a list of trips with optional pagination & search
const tripsList = async (req, res) => {
    try {
        // If page or limit params are provided, apply pagination
        if (req.query.page || req.query.limit) {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 6;
            const skip = (page - 1) * limit;
            const search = req.query.search || "";

            // Search filter by name, resort, or code
            const filter = search ? {
                $or: [
                    { name: { $regex: search,$options: "i" } },
                    { resort: { $regex: search,$options: "i" } },
                    { code: { $regex: search,$options: "i" } }
                ]
            } : {};

            const trips = await Model.find(filter)
                .skip(skip)
                .limit(limit)
                .exec();

            const totalTrips = await Model.countDocuments(filter);

            return res.status(200).json({
                trips,
                currentPage: page,
                totalPages: Math.ceil(totalTrips / limit) || 1,
                totalRecords: totalTrips
            });
        }

        // Default behavior: return all trips (unpaginated)
        const query = await Model.find({}).exec();
        if (!query || query.length === 0) {
            return res.status(404).json({ error: "No trips found." });
        }
        return res.status(200).json(query);

    } catch (err) {
        console.error("Error retrieving trips:", err);
        return res.status(500).json({ error: err.message });
    }
};

// GET endpoint: /trips/{code} - Single trip by code
const tripsFindByCode = async (req, res) => {
    try {
        const query = await Model
            .find({ "code": req.params.tripCode })
            .exec();

        if (!query || query.length === 0) {
            return res.status(404).json({ error: "Trip not found with provided code." });
        }

        return res.status(200).json(query);
    } catch (err) {
        console.error("Error finding trip by code:", err);
        return res.status(500).json({ error: err.message });
    }
};

// POST endpoint: /trips - Add a new trip
const tripsAddTrip = async (req, res) => {
    try {
        const newTrip = new Model({
            code: req.body.code,
            name: req.body.name,
            length: req.body.length,
            start: req.body.start,
            resort: req.body.resort,
            perPerson: req.body.perPerson,
            image: req.body.image,
            description: req.body.description
        });

        const savedTrip = await newTrip.save();

        // Audit Log Entry
        await Log.create({
            user: req.user ? req.user.email : "System",
            action: "CREATE",
            endpoint: `POST /api/trips`,
            status: "201 Created",
            description: `Created new trip package: ${savedTrip.code}`,
            details: { code: savedTrip.code, name: savedTrip.name }
        });

        return res.status(201).json(savedTrip);

    } catch (err) {
        console.error("Error creating trip:", err);
        return res.status(400).json({ error: err.message });
    }
};

// PUT endpoint: /trips/{code} - Edit a specific trip
const tripsUpdateTrip = async (req, res) => {
    try {
        // Locate existing document to record state prior to update
        const existingTrip = await Model.findOne({ "code": req.params.tripCode }).exec();

        if (!existingTrip) {
            return res.status(404).json({ error: "Trip code not found to update." });
        }

        const previousPrice = existingTrip.perPerson;

        // Perform direct MongoDB collection update to bypass mongoose-sequence hooks
        await Model.collection.updateOne(
            { code: req.params.tripCode },
            {
                $set: {
                    code: req.body.code,
                    name: req.body.name,
                    length: req.body.length,
                    start: new Date(req.body.start),
                    resort: req.body.resort,
                    perPerson: req.body.perPerson,
                    image: req.body.image,
                    description: req.body.description
                }
            }
        );

        // Retrieve updated record state for return payload
        const updatedTrip = await Model.findOne({ "code": req.body.code || req.params.tripCode }).exec();

        // Native driver insertion for Audit Log to bypass schema sequence hooks
        await Log.collection.insertOne({
            user: req.user ? req.user.email : "System",
            action: "UPDATE",
            endpoint: `PUT /api/trips/${req.params.tripCode}`,
            status: "200 OK",
            description: `Modified details for package ${updatedTrip.code}`,
            details: {
                previousPrice: previousPrice,
                updatedPrice: updatedTrip.perPerson
            },
            timeStamp: new Date()
        });

        return res.status(200).json(updatedTrip);

    } catch (err) {
        console.error("Error updating trip:", err);
        return res.status(400).json({ error: err.message });
    }
};

// DELETE endpoint: /trips/{code} - Delete a specific trip
const tripsDeleteTrip = async (req, res) => {
    try {
        const deletedTrip = await Model.findOneAndDelete({ "code": req.params.tripCode }).exec();

        if (!deletedTrip) {
            return res.status(404).json({ error: "Trip code not found to delete." });
        }

        // Audit Log Entry
        await Log.create({
            user: req.user ? req.user.email : "System",
            action: "DELETE",
            endpoint: `DELETE /api/trips/${req.params.tripCode}`,
            status: "200 OK",
            description: `Deleted trip package: ${req.params.tripCode}`
        });

        return res.status(200).json({ message: "Trip successfully deleted.", code: req.params.tripCode });

    } catch (err) {
        console.error("Error deleting trip:", err);
        return res.status(500).json({ error: err.message });
    }
};

module.exports = { 
    tripsList, 
    tripsFindByCode, 
    tripsAddTrip, 
    tripsUpdateTrip,
    tripsDeleteTrip 
};