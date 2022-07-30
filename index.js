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
    const appointmentCollection = client
      .db("doctors_portal")
      .collection("appointment");

    //  get multiple data
    app.get("/bookings", async (req, res) => {
      const query = {};
      const cursor = bookingCollection.find(query);
      const bookings = await cursor.toArray();
      res.send(bookings);
    });
    //  create/post single data of appointment to backend
    app.post("/appointment", async (req, res) => {
      const appointment = req.body;
      const query ={treatment:appointment.treatment, date:appointment.date, patient:appointment.patient}
      const exists = await appointmentCollection.findOne(query);
      if(exists){
        return res.send({success: false, appointment:exists})
      }
      const result = await appointmentCollection.insertOne(appointment);
      return res.send({success: true, result});
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
