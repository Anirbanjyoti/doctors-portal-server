const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// Middle ware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xlaxhk5.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// async function error
async function run() {
  try {
    await client.connect();
    const bookingCollection = client
      .db("doctors_portal")
      .collection("bookings");
    const serviceCollection = client
      .db("doctors_portal")
      .collection("services");
    const userCollection = client
      .db("doctors_portal")
      .collection("users");

    //  get multiple data
    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    // Warning: This is not the proper way to query multiple collection.
    // After learning more about mongodb. use aggregate, lookup, pipeline, match, group
    app.get("/available", async (req, res) => {
      const date = req.query.date || "Aug 1, 2022";

      // step 1:  get all services
      const services = await serviceCollection.find().toArray();

      // step 2: get the booking of that day. output: [{}, {}, {}, {}, {}, {}]
      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();

      // step 3: for each service
      services.forEach((service) => {
        // step 4: find bookings for that service. output: [{}, {}, {}, {}]
        const serviceBookings = bookings.filter(
          (b) => b.treatment === service.name
        );

        const bookedSlots = serviceBookings.map((s) => s.slot);
        // step 5: select slots for the service Bookings: ['', '', '', '']
        // const bookedSlots = serviceBookings.map((s) => console.log(s.slot));

        // step 6: select those slots that are not in bookedSlots
        // console.log(bookedSlots);

        const available = service.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        //step 7: set available to slots to make it easier
        service.slots = available;
      });

      res.send(services);
    });
    // Get All Bookings data for Dashboard
    app.get("/booking", async (req, res) => {
      const patientEmail = req.query.patient;
      const query = { patient: patientEmail };
      const bookings = await bookingCollection.find(query).toArray();
      res.send(bookings)
    });
    // By 'PUT' method taking Login registration User data
    app.put("/user/:email", async(req, res)=>{
      const email = req.params.email;
      const user = req.body;
      const filter = {email: email};
      const options = {upsert: true};
      const updateDoc ={
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    })
    //  create/post single data of booking and send to backend
    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const query = {
        treatment: booking.treatment,
        date: booking.date,
        patient: booking.patient,
      };
      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists });
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({ success: true, result });
    });
    /**
     * API Naming Convention
     * api.get('/booking') // get all booking
     * api.get('/booking/:id') // get a specific booking
     * api.post('/booking') // add a new booking
     * api.patch('/booking/:id')
     * api.delete('/booking/:id')
     */
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Doctors Portal!");
});

app.listen(port, () => {
  console.log(`Doctors app listening on port ${port}`);
});
