// Reqs and var init
const mongoose = require("mongoose");
require("../models/trip"); // Ensures schema is loaded into Mongoose memory
require("../models/log");  // Ensures audit log schema is loaded
const Model = mongoose.model("trips"); // Unified model reference for all CRUD operations
const Log = mongoose.model("logs");   // Audit log model reference

// GET endpoint: /trips - Paginated & Sorted Trips
const tripsList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const search = req.query.search || "";
        const sort = req.query.sort || "name-asc";

        const skip = (page - 1) * limit;

        const query = search
            ? {
                  $or: [
                      { name: { $regex: search, $options: "i" } },
                      { code: { $regex: search, $options: "i" } }
                  ]
              }
            : {};

        // Parse sorting directive
        let sortOption = {};
        switch (sort) {
            case "name-desc":
                sortOption = { name: -1 };
                break;
            case "price-asc":
                sortOption = { numericPrice: 1 };
                break;
            case "price-desc":
                sortOption = { numericPrice: -1 };
                break;
            case "name-asc":
            default:
                sortOption = { name: 1 };
                break;
        }

        // Use aggregation pipeline to cast string prices on the fly if needed
        const trips = await Model.aggregate([
            { $match: query },
            { 
                $addFields: { 
                    numericPrice: { $toDouble: "$perPerson" } 
                } 
            },
            { $sort: sortOption },
            { $skip: skip },
            { $limit: limit }
        ]);

        const totalRecords = await Model.countDocuments(query);
        const totalPages = Math.ceil(totalRecords / limit);

        return res.status(200).json({
            trips,
            currentPage: page,
            totalPages,
            totalRecords
        });
    } catch (err) {
        console.error("Error fetching trips:", err);
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

// Helper function to fetch the next sequential logID
const getNextLogId = async () => {
    const lastLog = await Log.findOne({}, { logID: 1 }).sort({ logID: -1 }).lean().exec();
    return lastLog && typeof lastLog.logID === 'number' ? lastLog.logID + 1 : 1;
};

// POST endpoint: /trips - Add a new trip
const tripsAddTrip = async (req, res) => {
    try {
        const tripDoc = {
            code: req.body.code,
            name: req.body.name,
            length: req.body.length,
            start: new Date(req.body.start),
            resort: req.body.resort,
            perPerson: req.body.perPerson,
            image: req.body.image,
            description: req.body.description
        };

        // Insert new trip via native driver
        const insertResult = await Model.collection.insertOne(tripDoc);

        // Fetch created document
        const savedTrip = await Model.findById(insertResult.insertedId).exec();

        // Compute next sequential logID to prevent unique constraint conflicts
        const nextId = await getNextLogId();

        // Native driver insertion for Audit Log with logID populated
        await Log.collection.insertOne({
            logID: nextId,
            user: req.user ? req.user.email : "System",
            action: "CREATE",
            endpoint: `POST /api/trips`,
            status: "201 Created",
            description: `Created new trip package: ${savedTrip.code}`,
            details: { code: savedTrip.code, name: savedTrip.name },
            timeStamp: new Date()
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

// DELETE endpoint: /trips/{code} - Remove a trip package
const tripsDeleteTrip = async (req, res) => {
    try {
        const tripCode = req.params.tripCode;

        // Locate the trip package first to capture details for audit logging
        const existingTrip = await Model.findOne({ code: tripCode }).exec();

        if (!existingTrip) {
            return res.status(404).json({ error: "Trip code not found to delete." });
        }

        // Perform native driver deletion to bypass mongoose hooks
        const deleteResult = await Model.collection.deleteOne({ code: tripCode });

        if (deleteResult.deletedCount === 0) {
            return res.status(400).json({ error: "Failed to delete trip record." });
        }

        // Compute next logID sequence number
        const nextLogId = await getNextLogId();

        // Native driver insertion for Audit Log with logID populated
        await Log.collection.insertOne({
            logID: nextLogId,
            user: req.user ? req.user.email : "System",
            action: "DELETE",
            endpoint: `DELETE /api/trips/${tripCode}`,
            status: "200 OK",
            description: `Deleted trip package: ${existingTrip.name} (${tripCode})`,
            details: {
                code: existingTrip.code,
                name: existingTrip.name,
                perPerson: existingTrip.perPerson
            },
            timeStamp: new Date()
        });

        return res.status(200).json({ message: `Trip ${tripCode} deleted successfully.` });

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