const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
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

// JWT Token verify
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}

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
    const userCollection = client.db("doctors_portal").collection("users");

    //  get multiple data
    app.get("/service", async (req, res) => {
      // const query = {};
      // const cursor = serviceCollection.find(query);
      // const services = await cursor.toArray();
      
      // ei 3 liner bodole eta 1 line e lekha jai
      const services = await serviceCollection.find().toArray();
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
    // Get All Bookings users data for Dashboard
    app.get("/booking", verifyJWT, async (req, res) => {
      const patient = req.query.patient;
      const decodedEmail = req.decoded.email;
      if(patient === decodedEmail){
        const query = { patient: patient };
        const bookings = await bookingCollection.find(query).toArray();
        return res.send(bookings);
      }
      else{
        return res.status(403).send({message: 'Forbidden Access'})
      }

    });
    // Get all user in your website 
    app.get('/user', verifyJWT, async(req,res)=>{
      const users = await userCollection.find().toArray();
      res.send(users);
    })
    // By 'PUT' method taking Login and registration User data
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1hr" }
      );
      res.send({ result, token });
    });
    // Restricted admin panel if you are not admin you can not access admin panel
    app.get('/admin/:email', async(req, res)=>{
      const email = req.params.email;
      const user = await userCollection.findOne({email: email});
      const isAdmin = user.role === 'admin';
      res.send({admin: isAdmin})
    })
    // User admin API
    app.put("/user/admin/:email",verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({email: requester})
      if(requesterAccount.role === 'admin'){
        const filter = { email: email };
        const updateDoc = {
          $set: {role:'admin'},
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send({result});
      }else{
        res.status(403).send({message:'Forbidden Access. You have no Permission'})
      }

    });
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
