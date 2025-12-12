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
    const UsersCollection = InfraDB.collection("users");

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

    app.post("/issues", async (req, res) => {
      try {
        const IssueData = req.body;

        IssueData.priority = "low";
        IssueData.status = "Pending";
        IssueData.created_at = new Date();

        console.log(IssueData);

        // Insert issue
        const result = await IssuesCollection.insertOne(IssueData);

        // Update user's issue count
        await UsersCollection.updateOne(
          { email: IssueData.reported_by },
          { $inc: { issuesReported: 1 } }
        );

        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Something went wrong" });
      }
    });

    //user related api
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        user.role = "citizen";
        user.createdAt = new Date();
        user.issuesReported = 0;
        user.isPremium = false;
        user.isBlocked = false;
        const email = user.email;
        const userExists = await UsersCollection.findOne({ email });

        if (userExists) {
          return res.send({ message: "user already exists" });
        }
        const result = await UsersCollection.insertOne(user);
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Something went wrong" });
      }
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = await UsersCollection.findOne({ email });

      if (!user) {
        return res.status(404).send({ success: false, user: null });
      }

      res.send({ success: true, user });
    });
    app.patch("/users/update/:email", async (req, res) => {
      try {
        const updatedData = req.body;
        const email = req.params.email;

        const result = await UsersCollection.updateOne(
          { email },
          { $set: updatedData }
        );

        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to update user" });
      }
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
