// Inserts realistic sample inquiries covering every category and user type.
// Does nothing if the inquiries table already has rows.
import { pool } from '../src/config/db.js';

const HOUR = 60 * 60 * 1000;

const SAMPLES = [
  {
    userType: 'Parent',
    category: 'Admission',
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phone: '+919876543210',
    message:
      'Hello, I would like to know the admission process and deadlines for Grade 6 for the 2027-28 session. Is there an entrance test, and can we visit the campus before applying?',
    status: 'New',
    hoursAgo: 1,
  },
  {
    userType: 'Student',
    category: 'Scholarship',
    name: 'Arjun Mehta',
    email: 'arjun.mehta@example.com',
    phone: '+919812345678',
    message:
      'I scored 94% in my Class 12 board exams. Am I eligible for the merit scholarship, and which documents do I need to submit along with the application?',
    status: 'In Progress',
    hoursAgo: 5,
  },
  {
    userType: 'School',
    category: 'Concert',
    name: 'Greenwood International School',
    email: 'events@greenwood.example.edu',
    phone: '+911145678901',
    message:
      'We would like to book 120 seats for our students at the annual winter music concert. Do you offer group discounts for schools, and is transport assistance available?',
    status: 'New',
    hoursAgo: 26,
  },
  {
    userType: 'Parent',
    category: 'General Query',
    name: 'Rahul Verma',
    email: 'rahul.verma@example.com',
    phone: '+919900112233',
    message:
      'Does the platform offer weekend doubt-clearing sessions for Class 10 Maths and Science? Please share the timings, batch size and fees.',
    status: 'Resolved',
    hoursAgo: 50,
  },
  {
    userType: 'Student',
    category: 'Admission',
    name: 'Sneha Iyer',
    email: 'sneha.iyer@example.com',
    phone: '+919845012345',
    message:
      'I want to apply for the Data Science foundation course. Can I join in the middle of the semester, and is hostel accommodation available for outstation students?',
    status: 'New',
    hoursAgo: 75,
  },
  {
    userType: 'School',
    category: 'Scholarship',
    name: 'Sunrise Public School',
    email: 'principal@sunrise.example.edu',
    phone: '+912240001234',
    message:
      'Our school would like to nominate five students for the need-based scholarship programme this year. Kindly share the nomination format and the last date for submission.',
    status: 'In Progress',
    hoursAgo: 98,
  },
  {
    userType: 'Parent',
    category: 'Concert',
    name: 'Anjali Nair',
    email: 'anjali.nair@example.com',
    phone: '+919747123456',
    message:
      'My daughter has been learning the violin for four years. Can students from outside your institute perform at the spring concert? How do we register for an audition?',
    status: 'New',
    hoursAgo: 146,
  },
  {
    userType: 'Student',
    category: 'General Query',
    name: 'Karan Singh',
    email: 'karan.singh@example.com',
    phone: '+919711223344',
    message:
      'I no longer have access to the email I used to register for the demo class. Could you help me update my email address or resend the class link to this one?',
    status: 'Resolved',
    hoursAgo: 194,
  },
];

try {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM inquiries');
  if (rows[0].count > 0) {
    console.log(`[seed:demo] Skipped: inquiries table already has ${rows[0].count} row(s).`);
  } else {
    const values = [];
    const tuples = SAMPLES.map((sample, i) => {
      const createdAt = new Date(Date.now() - sample.hoursAgo * HOUR);
      values.push(
        sample.userType,
        sample.category,
        sample.name,
        sample.email,
        sample.phone,
        sample.message,
        sample.status,
        createdAt,
      );
      const base = i * 8;
      // created_at and updated_at share the same timestamp parameter.
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 8})`;
    });

    await pool.query(
      `INSERT INTO inquiries (user_type, category, name, email, phone, message, status, created_at, updated_at)
       VALUES ${tuples.join(', ')}`,
      values,
    );
    console.log(`[seed:demo] Inserted ${SAMPLES.length} sample inquiries.`);
  }
} catch (err) {
  console.error('[seed:demo] Failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
