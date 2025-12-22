# CivicResolve – Public Infrastructure Issue Reporting System

CivicResolve is a full-featured MERN stack **Public Infrastructure Issue Reporting System** that allows citizens to report real-world public issues such as broken streetlights, potholes, water leakage, garbage overflow, and damaged footpaths.

Admins and staff can efficiently manage, verify, assign, and resolve issues using a secure role-based dashboard system. The platform improves transparency, reduces response time, and helps municipalities track infrastructure problems effectively.

---

## Features

### 🌍 Public Features

- Browse all reported infrastructure issues
- View issue details with images, category, status, priority, and location
- Upvote issues to show public importance
- Search and filter issues by category, status, priority
- Pagination and real-time UI updates

---

### 👤 Citizen Features (Private)

- Report new issues with image and location
- Free users can report up to **3 issues**
- Premium users can report **unlimited issues**
- Edit or delete own issues if status is **Pending**
- Track issue progress using a timeline
- Boost issue priority via Stripe payment (৳100)
- View payment history and invoices
- Profile management and premium subscription

---

### 👷 Staff Features (Private)

- View only assigned issues
- Update issue status:
  - Pending → In Progress → Working → Resolved → Closed
- Add progress updates
- Timeline automatically updates for every action
- Dashboard statistics and performance charts

---

### 🛡️ Admin Features (Private)

- View platform-wide statistics and analytics
- Manage all reported issues
- Assign staff to issues (one-time assignment)
- Reject pending issues
- Manage users (block / unblock citizens)
- Create, update, and delete staff accounts
- View all payments and download PDF invoices
- Admin profile management

---

### 🕒 Issue Timeline & Tracking

Each issue contains a **read-only timeline** that records:

- Issue creation
- Staff assignment
- Status updates
- Boost payments
- Issue resolution and closure

Each timeline entry includes:

- Status
- Updated by (Admin / Staff / Citizen)
- Date & time

---

## Tech Stack

### Frontend

- React 19
- React Router
- TanStack React Query
- TanStack Router / React Start
- Tailwind CSS
- PrimeReact
- Firebase Authentication
- Stripe JS
- Axios
- React Hook Form
- Leaflet & React Leaflet
- Recharts
- React PDF Renderer
- React Hot Toast
- React Icons

### Backend

- Node.js
- Express.js 5
- MongoDB (Native Driver)
- Firebase Admin SDK
- Stripe
- CORS
- Dotenv

---

## Installation

### 1. Clone the Server repository

```bash
git clone https://github.com/Nur-Nayeem/Infrastructure-Issues-Reporting-System-Server.git
```

### 1. Clone the Cloient repository

```bash
git clone https://github.com/Nur-Nayeem/Infrastructure-Issues-Reporting-System-Client.git
```

### 2. Install Backend Dependencies

```bash
cd Infrastructure-Issues-Reporting-System-Server
npm install
```

### 3. Install Frontend Dependencies

```bash
cd Infrastructure-Issues-Reporting-System-Client
npm install
```

### 4. Environment Variables

Server .env

```bash
PORT=5000
MONGODB_URI=your_mongodb_connection_string
FB_SERVICE_KEY=base64_encoded_firebase_service_key
STRIPE_SECRET=your_stripe_secret_key
CLIENT_URL=http://localhost:5173
```

Client .env

```bash
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
VITE_FB_apiKey=your_key
VITE_FB_authDomain=your_domain
VITE_FB_projectId=your_project_id
VITE_FB_storageBucket=your_storage_bucket
VITE_FB_messagingSenderId=your_messaging_sender_id
VITE_FB_appId=your_fb_app_id
VITE_Image_Host=imagebb_image_host_api
```

### 5. Run the Application

Backend

```bash
npm run dev
```

Frontend

```bash
npm run dev
```

### URLs

```bash
Frontend: http://localhost:5173

Backend: http://localhost:5000
```

## API Routes

Authentication
Firebase Authentication (Bearer Token)

### Users:

POST /users

GET /users/:email

GET /users/:email/role

PATCH /users/update 🔐

PATCH /users/:email/blocked 🔐🛡️

PATCH /users/:userId/subscribe 🔐

### Issues:

GET /issues

GET /issues/:id

GET /my-issues/:email 🔐

POST /issues 🔐

PATCH /issues/:issueId 🔐

DELETE /issues/:id 🔐

### Issue Actions:

PATCH /issues/:issueId/status 🔐👷

PATCH /issues/:issueId/assign-staff 🔐🛡️

PATCH /issues/:issueId/rejected 🔐🛡️

PATCH /issues/:issueId/upvote 🔐

POST /create-staff 🔐🛡️

GET /staff 🔐🛡️

PATCH /staff/:email 🔐🛡️

DELETE /staff/:email 🔐

### Payments:

POST /payment-checkout-session 🔐

POST /subscriptions/checkout 🔐

POST /payments/confirm

GET /payments/user 🔐

GET /payments 🔐🛡️

### Middleware Legend

🔐 Verify FirebaseToken

🛡️ Admin Only

👷 Staff Only

## Live Links:

- Frontend: [https://infrastructure-issue-reporting.web.app/](https://infrastructure-issue-reporting.web.app/)

- Backend: [https://server-public-infrastructure-issue-gold.vercel.app](https://server-public-infrastructure-issue-gold.vercel.app)

- Github (Client): [https://github.com/Nur-Nayeem/Infrastructure-Issues-Reporting-System-Client](https://github.com/Nur-Nayeem/Infrastructure-Issues-Reporting-System-Client)

- Github (Server): [https://github.com/Nur-Nayeem/Infrastructure-Issues-Reporting-System-Server](https://github.com/Nur-Nayeem/Infrastructure-Issues-Reporting-System-Server)
