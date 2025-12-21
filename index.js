const express = require("express");
const cors = require("cors");
require("dotenv").config();

const serviceAccount = require("./infraFbJson.json");
const admin = require("firebase-admin");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const port = process.env.PORT || 4000;
const app = express();

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGODB_URI;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyTokenWithFirebase = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const userInfo = await admin.auth().verifyIdToken(token);

  req.token_email = userInfo.email;

  next();
};

async function run() {
  try {
    // Connect once
    await client.connect();

    const InfraDB = client.db("infraDB");
    const IssuesCollection = InfraDB.collection("issues");
    const UsersCollection = InfraDB.collection("users");
    const PaymentsCollection = InfraDB.collection("payments");

    //rolebase middleware
    const verifyADMIN = async (req, res, next) => {
      console.log(req.tokenEmail);

      const email = req.tokenEmail;
      const user = await UsersCollection.findOne({ email });
      if (user?.role !== "admin")
        return res
          .status(403)
          .send({ message: "Admin only Actions!", role: user?.role });

      next();
    };

    // const verifySTAFF = async (req, res, next) => {
    //   const email = req.tokenEmail;
    //   const user = await UsersCollection.findOne({ email });
    //   if (user?.role !== "staff")
    //     return res
    //       .status(403)
    //       .send({ message: "Staff only Actions!", role: user?.role });

    //   next();
    // };

    //role geting api
    app.get("/users/:email/role", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await UsersCollection.findOne(query);
      res.send({ role: user?.role || "user" });
    });

    // Get all issues
    app.get("/issues", async (req, res) => {
      try {
        const {
          category,
          status,
          search,
          priority,
          limit = 0,
          skip = 0,
          recent,
          email,
          assignedto,
          reportedby,
        } = req.query;
        let query = {};
        if (email) {
          query.reportedBy = email;
        }
        if (category) {
          query.category = category;
        }
        if (status) {
          query.status = status;
        }
        if (priority) {
          query.priority = priority;
        }
        if (search) {
          query.title = { $regex: search, $options: "i" };
        }
        if (reportedby) {
          query.reportedBy = reportedby;
        }
        if (assignedto) {
          query.assignedTo = assignedto;
        }
        const sort = {};
        if (recent == "true") {
          sort.createdAt = -1;
        }

        const result = await IssuesCollection.find(query)
          .sort(sort)
          .limit(Number(limit))
          .skip(Number(skip))
          .project({ updated_at: 0 })
          .toArray();

        const count = await IssuesCollection.countDocuments(query);

        // res.send(result);
        res.send({ result, total: count });
      } catch (err) {
        res.status(500).send({ message: "Error fetching issues" });
      }
    });

    app.get("/my-issues/:email", verifyTokenWithFirebase, async (req, res) => {
      try {
        const { email } = req.params;
        const result = await IssuesCollection.find({ reportedBy: email })
          .sort({ createdAt: -1 })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error });
      }
    });

    app.get("/issues/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const Id = new ObjectId(id);
        const result = await IssuesCollection.findOne({ _id: Id });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error });
      }
    });
    app.delete("/issues/:id", verifyTokenWithFirebase, async (req, res) => {
      try {
        const { id } = req.params;
        const Id = new ObjectId(id);
        const result = await IssuesCollection.deleteOne({ _id: Id });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error });
      }
    });

    app.post("/issues", verifyTokenWithFirebase, async (req, res) => {
      try {
        const IssueData = req.body;

        IssueData.priority = "Low";
        IssueData.status = "Pending";
        IssueData.createdAt = new Date();
        IssueData.upvoted = 0;

        IssueData.statusTimeline = [
          {
            status: "Pending",
            changedAt: new Date(),
            changedBy: IssueData.reportedBy,
          },
        ];

        const result = await IssuesCollection.insertOne(IssueData);

        await UsersCollection.updateOne(
          { email: IssueData.reportedBy },
          { $inc: { issuesReported: 1 } }
        );

        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Something went wrong" });
      }
    });

    app.patch("/issues/:issueId", verifyTokenWithFirebase, async (req, res) => {
      try {
        const { issueId } = req.params;
        const body = req.body;

        const { _id, ...updatedIssue } = body;
        const filter = { _id: new ObjectId(issueId) };
        const updateDoc = {
          $set: updatedIssue,
        };
        const result = await IssuesCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (err) {
        console.error(err); // Log the actual error for debugging
        res.status(500).send({ message: "Failed to update issue" });
      }
    });

    app.patch(
      "/issues/:issueId/status",
      verifyTokenWithFirebase,
      async (req, res) => {
        try {
          const { issueId } = req.params;
          const { status, userEmail } = req.body;

          const Id = new ObjectId(issueId);

          const result = await IssuesCollection.updateOne(
            { _id: Id },
            {
              $set: { status },
              $push: {
                statusTimeline: {
                  status,
                  changedAt: new Date(),
                  changedBy: userEmail,
                },
              },
            }
          );

          res.send(result);
        } catch (err) {
          res.status(500).send({ message: "Failed to update status" });
        }
      }
    );

    app.patch("/issues/:issueId/upvote", async (req, res) => {
      try {
        const { issueId } = req.params;
        const { email } = req.body;
        const Id = new ObjectId(issueId);

        // Prevent duplicate upvote
        const issue = await IssuesCollection.findOne({
          _id: Id,
          "upvotedUsers.email": email,
        });

        if (issue) {
          return res.status(400).send({ message: "Already upvoted" });
        }

        const result = await IssuesCollection.updateOne(
          { _id: Id },
          {
            $inc: { upvoted: 1 },
            $push: {
              upvotedUsers: { email },
            },
          }
        );

        res.send({ success: true, result });
      } catch (error) {
        res.status(500).send({ message: "Upvote failed" });
      }
    });

    app.patch(
      "/issues/:issueId/assign-staff",
      verifyTokenWithFirebase,
      async (req, res) => {
        try {
          const { issueId } = req.params;
          const { staffEmail } = req.body;

          const Id = new ObjectId(issueId);
          const result = await IssuesCollection.updateOne(
            { _id: Id },
            {
              $set: { assignedTo: staffEmail, assignedAt: new Date() },
            }
          );
          res.send(result);
        } catch (error) {
          res.status(500).send({ message: error });
        }
      }
    );

    app.patch(
      "/issues/:issueId/rejected",
      verifyTokenWithFirebase,
      async (req, res) => {
        const { issueId } = req.params;
        const Id = new ObjectId(issueId);
        const result = await IssuesCollection.updateOne(
          { _id: Id },
          {
            $set: { status: "Rejected" },
            $push: {
              statusTimeline: {
                status: "Rejected",
                changedAt: new Date(),
                changedBy: "admin",
              },
            },
          }
        );
        res.send(result);
      }
    );

    app.patch(
      "/issues/:issueId/boosted",
      verifyTokenWithFirebase,
      async (req, res) => {
        const { issueId } = req.params;
        const Id = new ObjectId(issueId);
        const result = await IssuesCollection.updateOne(
          { _id: Id },
          {
            $set: { priority: "High" },
          }
        );
        res.send(result);
      }
    );

    //user related api
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
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

    app.get("/users", async (req, res) => {
      const { role, status } = req.query;
      const query = {};
      if (role) {
        query.role = role;
      }
      if (status) {
        query.status = status;
      }
      const result = await UsersCollection.find(query).toArray();
      res.send(result);
    });
    app.patch(
      "/users/:email/blocked",
      verifyTokenWithFirebase,
      async (req, res) => {
        const { email } = req.params;
        console.log(email);

        const user = await UsersCollection.findOne({ email });
        console.log(user);

        const result = await UsersCollection.updateOne(
          { email },
          {
            $set: {
              isBlocked: !user.isBlocked,
            },
          }
        );
        res.send(result);
      }
    );

    app.post("/create-staff", verifyTokenWithFirebase, async (req, res) => {
      const { name, email, password, phone, photoURL } = req.body;

      try {
        const user = await admin.auth().createUser({
          email,
          password,
          displayName: name,
          photoURL,
        });

        await UsersCollection.insertOne({
          uid: user.uid,
          displayName: name,
          email,
          phone,
          photoURL,
          status: "active",
          role: "staff",
          createdAt: new Date(),
        });

        res.send({ success: true });
      } catch (err) {
        res.status(500).send({ message: err.message });
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

    // GET all staff
    app.get("/staff", verifyTokenWithFirebase, async (req, res) => {
      const { status } = req.query;
      const query = {};
      query.role = "staff";
      if (status) {
        query.status = status;
      }
      const result = await UsersCollection.find(query).toArray();
      res.send(result);
    });

    // UPDATE staff
    app.patch("/staff/:email", verifyTokenWithFirebase, async (req, res) => {
      const email = req.params.email;
      const updateData = req.body;

      const result = await UsersCollection.updateOne(
        { email },
        { $set: updateData }
      );

      res.send(result);
    });

    // DELETE staff
    app.delete("/staff/:email", verifyTokenWithFirebase, async (req, res) => {
      const email = req.params.email;

      const result = await UsersCollection.deleteOne({ email });
      res.send(result);
    });

    app.patch(
      "/users/update/:email",

      async (req, res) => {
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
      }
    );
    app.patch(
      "/users/:userId/subscribe",
      verifyTokenWithFirebase,
      async (req, res) => {
        try {
          const { userId } = req.params;
          const Uid = new ObjectId(userId);

          const result = await UsersCollection.updateOne(
            { _id: Uid },
            {
              $set: { isPremium: true, subscriptionDate: new Date() },
            }
          );

          res.send({
            success: true,
            message: "User subscribed successfully",
            result,
          });
        } catch (error) {
          res.status(500).send({
            success: false,
            message: "Subscription failed",
          });
        }
      }
    );

    // issues boost related api
    app.post(
      "/payment-checkout-session",
      verifyTokenWithFirebase,
      async (req, res) => {
        const { issueId, userId } = req.body;

        try {
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [
              {
                price_data: {
                  currency: "bdt",
                  product_data: {
                    name: "Boost Issue",
                    description: "Boost issue",
                  },
                  unit_amount: 10000, // ৳100.00
                },
                quantity: 1,
              },
            ],
            success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
            metadata: {
              issueId,
              userId,
            },
          });

          res.send({ url: session.url });
        } catch (error) {
          res.status(500).send({ error: error.message });
        }
      }
    );

    // user subcription related api
    app.post(
      "/subscriptions/checkout",
      verifyTokenWithFirebase,
      async (req, res) => {
        const { userId } = req.body;

        try {
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [
              {
                price_data: {
                  currency: "bdt",
                  product_data: {
                    name: "Premium Subscription",
                    description: "One-time premium access",
                  },
                  unit_amount: 100000, // ৳1000
                },
                quantity: 1,
              },
            ],
            success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/subscription-cancel`,
            metadata: {
              userId,
            },
          });

          res.send({ url: session.url });
        } catch (err) {
          res.status(500).send({ message: err.message });
        }
      }
    );

    //confirm payment api
    app.post("/payments/confirm", async (req, res) => {
      const { sessionId } = req.body;

      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid") {
          return res.status(400).send({ message: "Payment not completed" });
        }

        const exists = await PaymentsCollection.findOne({
          paymentId: session.id,
        });

        if (exists) {
          return res.send({ message: "Payment already saved" });
        }

        // save
        await PaymentsCollection.insertOne({
          paymentId: session.id,
          userId: session.metadata.userId,
          issueId: session.metadata.issueId || null,
          amount: session.amount_total / 100,
          currency: session.currency,
          paymentType: session.metadata.issueId
            ? "ISSUE_BOOST"
            : "SUBSCRIPTION",
          status: "SUCCESS",
          createdAt: new Date(),
        });

        // boost issues
        if (session.metadata.issueId) {
          await IssuesCollection.updateOne(
            { _id: new ObjectId(session.metadata.issueId) },
            { $set: { priority: "High", boostedAt: new Date() } }
          );
        }

        // active premium
        if (!session.metadata.issueId) {
          await UsersCollection.updateOne(
            { _id: new ObjectId(session.metadata.userId) },
            {
              $set: {
                isPremium: true,
                subscriptionDate: new Date(),
              },
            }
          );
        }

        res.send({ success: true });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Payment verification failed" });
      }
    });

    app.get("/payments", verifyTokenWithFirebase, async (req, res) => {
      const result = await PaymentsCollection.find({})
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });
    app.get(
      "/payments/user/:userId",
      verifyTokenWithFirebase,
      async (req, res) => {
        const { userId } = req.params;
        const result = await PaymentsCollection.findOne({ userId })
          .sort({ createdAt: -1 })
          .toArray();
        res.send(result);
      }
    );

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
