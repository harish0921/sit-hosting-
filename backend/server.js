const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const session = require("express-session");
require("dotenv").config();

const app = express();

/* =====================================================
   ✅ CORS CONFIG (ALLOW GOV SITE + COOKIES)
===================================================== */

app.use(cors({
  origin: "http://localhost:4000", // government site port
  credentials: true
}));

app.use(express.json());

/* =====================================================
   ✅ SESSION CONFIG
===================================================== */

app.use(session({
  name: "courseSession",
  secret: "course-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,       // true only if HTTPS
    httpOnly: true,
    sameSite: "lax",
    maxAge: 10 * 60 * 1000 // 10 minutes session
  }
}));

const SECRET = "gov-secret-key";

/* =====================================================
   🔐 ACCESS COURSE (FROM GOV SITE ONLY)
===================================================== */

app.post("/access-course", (req, res) => {
  const { token, courseId } = req.body;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);

    if (!decoded.eligibleCourses.includes(courseId)) {
      return res.status(403).json({ message: "Not eligible for this course" });
    }

    // ✅ Create secure session
    req.session.user = decoded;
    req.session.courseId = courseId;

    return res.json({ success: true });

  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
});

/* =====================================================
   🏠 COURSE HOME PAGE (PROTECTED)
===================================================== */

app.get("/", (req, res) => {

  if (!req.session.user) {
    return res.status(403).send("<h2>❌ Direct Access Not Allowed</h2>");
  }

  res.send(`
    <h1>🎉 Welcome to ${req.session.courseId.toUpperCase()} Course</h1>
    <p>User ID: ${req.session.user.id}</p>
    <p>Secure session-based access.</p>
  `);
});

/* =====================================================
   📧 CONTACT FORM (OPTIONAL)
===================================================== */

app.post("/send", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: "All fields required!" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"${name}" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "New Message",
      html: `<p>${message}</p>`,
    });

    res.json({ message: "Email sent!" });

  } catch (err) {
    res.status(500).json({ message: "Email error" });
  }
});

/* =====================================================
   🚀 START SERVER
===================================================== */

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Course site running at http://localhost:${PORT}`);
});
