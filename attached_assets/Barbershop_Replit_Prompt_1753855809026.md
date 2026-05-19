# 🧠 FULL BARBERSHOP APP PROMPT FOR REPLIT

---

## 🔧 BACKEND PROMPT (NODE.JS + SQLITE + NAMEDAY TABLE + OAUTH)

Build a fully functional **Barbershop Appointment App backend** using **Node.js (Express)** and **SQLite** inside Replit. This must be a **complete, error-free, ready-to-use project**, not a scaffold or demo.

### ✅ Core Requirements:
- **User registration & login** via **Google and Facebook OAuth**
- Store user's `first_name` and `email` in `users` table
- Enable users to:
  - Book appointments (service, barber, date, time)
  - View and cancel appointments
- Admin section must:
  - View all appointments by day/barber
  - Automatically check Greek namedays (from local database)
  - Send personalized push notifications (simulated via `console.log`)

### ✅ Nameday Support:
- Create a local table `namedays` with fields:
  - `date` (format: `MM-DD`)
  - `name` (first name)
- On system startup or via endpoint `/nameday/check`, match `users.first_name` with today’s nameday(s) and send:
  ```
  🔔 PUSH to [email]: Χρόνια Πολλά [first_name]! Enjoy a 20% discount today!
  ```

### ✅ Database Schema (SQLite):
- `users(id, first_name, email, oauth_provider)`
- `appointments(id, user_id, service, barber, date, time)`
- `namedays(id, date, name)`

### ✅ REST API Endpoints:
- `POST /auth/google` and `/auth/facebook`: perform OAuth and create/login user
- `GET /users`: list all users
- `POST /appointments`: create appointment
- `GET /appointments`: list all appointments
- `DELETE /appointments/:id`: cancel appointment
- `GET /nameday/check`: run nameday check and push greetings

### ✅ Push Notification Simulation:
- Send push messages by printing via `console.log`
- Use `sendPush(email, message)` service module

### ✅ Folder Structure:
```
barbershop-app/
├── index.js
├── .replit
├── package.json
├── routes/
│   ├── auth.js
│   ├── appointments.js
│   └── nameday.js
├── models/
│   ├── db.js
│   └── nameday.js
├── services/
│   └── notifications.js
└── public/index.html (optional landing page)
```

### ✅ Required Libraries:
- `express`
- `sqlite3`
- `passport`, `passport-google-oauth20`, `passport-facebook`
- `express-session`
- `dotenv`

### ✅ Replit Configuration:
- Use `.replit` with `run = "node index.js"`
- Create and initialize the SQLite database on first run
- Insert sample nameday entries and one test user for validation

### ✅ Success Criteria:
- Runs 100% clean inside Replit
- User can log in with Google or Facebook
- Admin can access live endpoint to push nameday messages
- Code is modular, separated in folders
- No placeholders. Every route and function is implemented

---

## 💻 FRONTEND PROMPT (REACT CLIENT)

Create a complete **React frontend** that works seamlessly with the backend of a Barbershop Appointment App as described below. This project will connect to the backend that includes:
- Google and Facebook OAuth
- Booking system (service, barber, date/time)
- Nameday notifications via local DB
- SQLite + Express API

### ✅ Functional Requirements:

1. **Login Page**
   - Buttons for: "Login with Google" and "Login with Facebook"
   - Upon success, fetch and store user's `first_name`, `email`

2. **Home / Dashboard**
   - Welcome message: “Hello, [first_name]!”
   - Button: **Book Appointment**
   - Button: **My Appointments**
   - Button: **Check Nameday**
   - Optional: display today’s nameday list

3. **Book Appointment Page**
   - Dropdown for: Service (Haircut, Beard, Combo, etc.)
   - Dropdown for: Barber
   - Date Picker
   - Time Picker
   - Submit button to POST to `/appointments`

4. **My Appointments Page**
   - Show all booked appointments
   - Cancel option (calls DELETE `/appointments/:id`)

5. **Admin Only (optional route)**
   - Button: “Trigger Nameday Push Check” (GET `/nameday/check`)
   - Table view: users with today’s nameday

### ✅ Technical Specs:
- **React + Hooks + Context or Redux** for auth state
- Use **axios** for API calls
- Responsive layout with **Tailwind CSS** or **Bootstrap**
- Use **react-router** for page navigation
- Store auth state in localStorage/sessionStorage
- Error handling and loading states for all requests
- Dual-language support (EN / GR) ready (manual toggle or auto)

### ✅ File Structure:
```
/src
├── App.js
├── index.js
├── components/
│   ├── Navbar.js
│   ├── LoginButtons.js
│   ├── AppointmentForm.js
│   ├── AppointmentList.js
│   └── NamedayPanel.js
├── pages/
│   ├── Home.js
│   ├── Book.js
│   ├── Appointments.js
│   └── Admin.js
├── services/
│   └── api.js (axios config)
├── context/
│   └── AuthContext.js
├── styles/
│   └── global.css
```

### ✅ Extras:
- Pre-fill first name in the form from login info
- Toast messages (e.g. “Booking confirmed!”)
- Use clean and modern UI (no placeholders)

🔒 All backend routes are already live at `http://localhost:3000` or Replit’s web address.


---

## 🔔 UPDATED PUSH MESSAGING & NAMEDAY CUSTOMIZATION REQUIREMENTS

### ✅ Push Messaging (Promotions, Reminders, Namedays)
- Implement a complete push messaging module inside the app.
- Support sending messages to:
  - All users
  - Users with upcoming appointments
  - Users who celebrate their nameday today
- Admin must be able to:
  - Compose a **custom push message**
  - Choose **target audience** (e.g., All Users, Nameday, Specific Email)
  - Trigger message from a dashboard/admin page
- Push messaging engine should simulate delivery with `console.log`, but be modular so real push (Firebase/OneSignal) can be added later.

### ✅ Nameday Messages (Customizable)
- The nameday greeting **must not be hard-coded**.
- Admin must define the message (e.g., “Χρόνια Πολλά {name}, έλα σήμερα για 20% έκπτωση!”).
- Use a placeholder like `{name}` that gets dynamically replaced with the matched user's first name.
- Save default message in memory or SQLite table (`settings` or `messages` table).
- Admin UI should allow updating the message template for namedays and offers.

### ✅ Admin Push Dashboard Requirements
- Route: `/admin/push` (protected)
- Form fields:
  - Message title
  - Message body (supports `{name}` placeholder)
  - Target audience (dropdown: All, Nameday Today, Upcoming Appointments)
- Submit button triggers `sendPush(email, message)` for all matched users.

✅ All changes must be included in Replit-ready code, no placeholders, and the system must still run with zero errors.

