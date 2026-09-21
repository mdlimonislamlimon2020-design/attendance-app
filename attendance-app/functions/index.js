const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

admin.initializeApp();
const db = admin.database();

// Set these once via:
//   firebase functions:secrets:set BULKSMSBD_API_KEY
//   firebase functions:secrets:set BULKSMSBD_SENDER_ID
const BULKSMSBD_API_KEY = defineSecret("BULKSMSBD_API_KEY");
const BULKSMSBD_SENDER_ID = defineSecret("BULKSMSBD_SENDER_ID");

// ---------- helpers ----------

async function assertIsAdmin(uid) {
  if (!uid) throw new HttpsError("unauthenticated", "লগইন করা নেই।");
  const snap = await db.ref(`admins/${uid}`).get();
  if (!snap.exists() || snap.val() !== true) {
    throw new HttpsError("permission-denied", "শুধু অ্যাডমিন এই কাজটা করতে পারবে।");
  }
}

// "01712345678" -> "8801712345678" (BulkSMSBD expects the country code, no leading 0)
function toBdInternational(localPhone) {
  const digits = String(localPhone || "").replace(/[^0-9]/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return "880" + digits.slice(1);
  return "880" + digits;
}

// Sends up to 100 personalized messages per BulkSMSBD call (their documented
// limit); splits into batches automatically for larger lists.
async function sendBulkSms(apiKey, senderId, items) {
  const BATCH_SIZE = 100;
  const results = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const body = new URLSearchParams();
    body.set("api_key", apiKey);
    body.set("senderid", senderId);
    body.set(
      "messages",
      JSON.stringify(batch.map((it) => ({ to: it.to, message: it.message })))
    );
    const res = await fetch("https://bulksmsbd.net/api/smsapimany", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const text = await res.text();
    results.push({ batchStart: i, status: res.status, response: text });
    if (!res.ok) {
      logger.error("BulkSMSBD batch failed", { status: res.status, text });
    }
  }
  return results;
}

// ---------- callable functions ----------

/**
 * Admin calls this after a day's classes are done for a session. Computes
 * each student's attendance for that specific date's classes and texts
 * their guardian a one-line summary.
 *
 * data: { sessionId: string, date: string } — date is "yyyy-mm-dd"
 */
exports.sendDailyAttendanceSms = onCall(
  { secrets: [BULKSMSBD_API_KEY, BULKSMSBD_SENDER_ID] },
  async (request) => {
    await assertIsAdmin(request.auth?.uid);
    const { sessionId, date } = request.data || {};
    if (!sessionId || !date) {
      throw new HttpsError("invalid-argument", "sessionId ও date দুটোই দরকার।");
    }

    const [sessionSnap, classesSnap, studentsSnap, privateSnap, attendanceSnap] =
      await Promise.all([
        db.ref(`sessions/${sessionId}`).get(),
        db.ref(`classes/${sessionId}`).get(),
        db.ref(`students/${sessionId}`).get(),
        db.ref(`studentsPrivate/${sessionId}`).get(),
        db.ref(`attendance/${sessionId}`).get(),
      ]);

    if (!sessionSnap.exists()) throw new HttpsError("not-found", "সেশন পাওয়া যায়নি।");

    const allClasses = classesSnap.exists() ? Object.values(classesSnap.val()) : [];
    const todaysClasses = allClasses.filter((c) => c.date === date);
    if (todaysClasses.length === 0) {
      return { sent: 0, skipped: 0, message: "এই তারিখে কোনো ক্লাস পাওয়া যায়নি।" };
    }

    const students = studentsSnap.exists() ? Object.values(studentsSnap.val()) : [];
    const privateMap = privateSnap.exists() ? privateSnap.val() : {};
    const attendance = attendanceSnap.exists() ? attendanceSnap.val() : {};
    const sessionName = sessionSnap.val().name || "";

    const items = [];
    let skipped = 0;

    for (const s of students) {
      const priv = privateMap[s.id];
      if (!priv || !priv.guardianPhone) {
        skipped += 1;
        continue;
      }
      let attended = 0;
      for (const c of todaysClasses) {
        if (attendance[c.id] && attendance[c.id][s.id]) attended += 1;
      }
      const message =
        `প্রিয় অভিভাবক, আজ (${date}) ${sessionName}-এ মোট ${todaysClasses.length}টি ক্লাস হয়েছে। ` +
        `আপনার সন্তান ${s.name} উপস্থিত ছিল ${attended}টি ক্লাসে। ধন্যবাদ।`;
      items.push({ to: toBdInternational(priv.guardianPhone), message });
    }

    if (items.length === 0) {
      return { sent: 0, skipped, message: "কোনো স্টুডেন্টের অভিভাবকের নম্বর পাওয়া যায়নি।" };
    }

    const batchResults = await sendBulkSms(
      BULKSMSBD_API_KEY.value(),
      BULKSMSBD_SENDER_ID.value(),
      items
    );

    return { sent: items.length, skipped, batches: batchResults.length };
  }
);

/**
 * Admin or the exam's own teacher calls this once marks are ready. Copies
 * each graded student's mark into their private publishedResults (so they
 * can see it in the app), texts their guardian the score, and marks the
 * exam as published.
 *
 * data: { sessionId: string, examId: string }
 */
exports.publishExamResults = onCall(
  { secrets: [BULKSMSBD_API_KEY, BULKSMSBD_SENDER_ID] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "লগইন করা নেই।");

    const { sessionId, examId } = request.data || {};
    if (!sessionId || !examId) {
      throw new HttpsError("invalid-argument", "sessionId ও examId দরকার।");
    }

    const examSnap = await db.ref(`exams/${sessionId}/${examId}`).get();
    if (!examSnap.exists()) throw new HttpsError("not-found", "পরীক্ষা পাওয়া যায়নি।");
    const exam = examSnap.val();

    // caller must be an admin, or the teacher who owns this exam
    const adminSnap = await db.ref(`admins/${uid}`).get();
    const isAdmin = adminSnap.exists() && adminSnap.val() === true;
    if (!isAdmin) {
      const teacherMapSnap = await db.ref(`teacherAuthMap/${uid}`).get();
      const isOwningTeacher =
        teacherMapSnap.exists() &&
        teacherMapSnap.val().sessionId === sessionId &&
        teacherMapSnap.val().teacherId === exam.teacherId;
      if (!isOwningTeacher) {
        throw new HttpsError("permission-denied", "এই পরীক্ষাটা তোমার না, প্রকাশ করতে পারবে না।");
      }
    }

    const [resultsSnap, studentsSnap, privateSnap, teacherSnap] = await Promise.all([
      db.ref(`examResults/${sessionId}/${examId}`).get(),
      db.ref(`students/${sessionId}`).get(),
      db.ref(`studentsPrivate/${sessionId}`).get(),
      db.ref(`teachers/${exam.teacherId}`).get(),
    ]);

    const results = resultsSnap.exists() ? resultsSnap.val() : {};
    const students = studentsSnap.exists() ? studentsSnap.val() : {};
    const privateMap = privateSnap.exists() ? privateSnap.val() : {};
    const teacherName = teacherSnap.exists() ? teacherSnap.val().name : "";

    const now = Date.now();
    const dbUpdates = {};
    const smsItems = [];
    let published = 0;
    let skipped = 0;

    for (const [studentId, marks] of Object.entries(results)) {
      const student = students[studentId];
      if (!student) continue;
      dbUpdates[`publishedResults/${sessionId}/${studentId}/${examId}`] = {
        examTitle: exam.title,
        totalMarks: exam.totalMarks,
        marks,
        date: exam.date,
        teacherName,
        publishedAt: now,
      };
      published += 1;

      const priv = privateMap[studentId];
      if (priv && priv.guardianPhone) {
        smsItems.push({
          to: toBdInternational(priv.guardianPhone),
          message:
            `প্রিয় অভিভাবক, আপনার সন্তান ${student.name} "${exam.title}" পরীক্ষায় ` +
            `পেয়েছে ${marks}/${exam.totalMarks}। ধন্যবাদ।`,
        });
      } else {
        skipped += 1;
      }
    }

    dbUpdates[`exams/${sessionId}/${examId}/published`] = true;
    dbUpdates[`exams/${sessionId}/${examId}/publishedAt`] = now;
    await db.ref().update(dbUpdates);

    let smsSent = 0;
    if (smsItems.length > 0) {
      await sendBulkSms(BULKSMSBD_API_KEY.value(), BULKSMSBD_SENDER_ID.value(), smsItems);
      smsSent = smsItems.length;
    }

    return { published, smsSent, skipped };
  }
);
