const express = require("express");
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 4000;
const app = express();

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = process.env.MONGODB_URI;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect once
    await client.connect();

    const InfraDB = client.db("infraDB");
    const IssuesCollection = InfraDB.collection("issues");

    // Get all issues
    app.get("/issues", async (req, res) => {
      const { status, limit = 0 } = req.query;
      const query = {};
      try {
        if (status) {
          query.status = status;
        }
        const result = await IssuesCollection.find(query)
          .limit(Number(limit))
          .toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Error fetching issues" });
      }
    });

    //user related api
    app.post("/users", (req, res) => {
      const userData = req.body;
      console.log(userData);
    });

    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("Database Error:", error);
  }
}

run();

app.get("/", (req, res) => {
  res.send("Hello from Server..");
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
