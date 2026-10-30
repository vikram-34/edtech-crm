import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { CATEGORIES, MESSAGE_MAX, NAME_MAX, USER_TYPES, slugify, validateInquiry } from '../constants.js';

const INITIAL_VALUES = { userType: '', category: '', name: '', email: '', phone: '', message: '' };
const FIELD_ORDER = Object.keys(INITIAL_VALUES);

const TOPICS = [
  { category: 'Scholarship', text: 'Eligibility, merit and need-based awards, documents and deadlines.' },
  { category: 'Concert', text: 'Tickets, group bookings for schools and performer registrations.' },
  { category: 'Admission', text: 'Application process, entrance tests, fees and campus visits.' },
  { category: 'General Query', text: 'Anything else: courses, accounts, schedules or support.' },
];

function Field({ id, label, error, hint, counter, full = false, children }) {
  return (
    <div className={`field${full ? ' field--full' : ''}${error ? ' field--invalid' : ''}`}>
      <label htmlFor={id}>
        {label}
        <span className="required" aria-hidden="true">
          {' '}*
        </span>
      </label>
      {children}
      {(error || hint || counter) && (
        <div className="field__meta">
          {error ? (
            <p id={`${id}-error`} className="field__error">
              {error}
            </p>
          ) : (
            <p className="field__hint">{hint}</p>
          )}
          {counter && <span className="field__counter">{counter}</span>}
        </div>
      )}
    </div>
  );
}

export default function InquiryForm() {
  const formRef = useRef(null);
  const noticeRef = useRef(null);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const clientErrors = validateInquiry(values);
  const errorFor = (field) => serverErrors[field] || (touched[field] ? clientErrors[field] : undefined);

  useEffect(() => {
    if (notice) noticeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [notice]);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setServerErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function handleBlur(event) {
    const { name } = event.target;
    setTouched((prev) => (prev[name] ? prev : { ...prev, [name]: true }));
  }

  const fieldProps = (name) => {
    const error = errorFor(name);
    return {
      id: name,
      name,
      value: values[name],
      onChange: handleChange,
      onBlur: handleBlur,
      disabled: submitting,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? `${name}-error` : undefined,
    };
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice(null);
    setTouched(Object.fromEntries(FIELD_ORDER.map((field) => [field, true])));

    const firstInvalid = FIELD_ORDER.find((field) => clientErrors[field]);
    if (firstInvalid) {
      formRef.current?.elements.namedItem(firstInvalid)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await api.submitInquiry(values);
      const firstName = values.name.trim().split(/\s+/)[0];
      setValues(INITIAL_VALUES);
      setTouched({});
      setServerErrors({});
      setNotice({
        type: 'success',
        message: `Thank you, ${firstName}! Your inquiry has been received. Our team will get back to you within 24-48 hours.`,
      });
    } catch (err) {
      if (err.errors) setServerErrors(err.errors);
      setNotice({
        type: 'error',
        message: err.errors ? 'Some details need attention. Please fix the highlighted fields and try again.' : err.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inquiry-page">
      <section className="hero">
        <span className="hero__eyebrow">Admissions · Scholarships · Events</span>
        <h1 className="hero__title">How can we help you?</h1>
        <p className="hero__text">
          Parents, students and schools can send us a question in under a minute. No account needed: our team will
          reply by email or phone.
        </p>
      </section>

      <div className="inquiry-layout">
        <section className="card" aria-labelledby="inquiry-form-title">
          <div className="card__header">
            <h2 id="inquiry-form-title" className="card__title">
              Submit an inquiry
            </h2>
            <p className="card__subtitle">Fields marked * are required.</p>
          </div>

          <div className="card__body">
            {notice && (
              <div
                ref={noticeRef}
                className={`alert alert--${notice.type}`}
                role={notice.type === 'error' ? 'alert' : 'status'}
              >
                <span className="alert__icon" aria-hidden="true">
                  {notice.type === 'success' ? '✓' : '!'}
                </span>
                <span className="alert__text">{notice.message}</span>
                <button type="button" className="alert__close" onClick={() => setNotice(null)} aria-label="Dismiss">
                  ×
                </button>
              </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit} noValidate>
              <fieldset className="form-section">
                <legend className="form-section__title">About your inquiry</legend>
                <div className="form-grid">
                  <Field id="userType" label="User Type" error={errorFor('userType')}>
                    <select {...fieldProps('userType')} className={`select${values.userType ? '' : ' select--placeholder'}`}>
                      <option value="">Select...</option>
                      {USER_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field id="category" label="Category" error={errorFor('category')}>
                    <select {...fieldProps('category')} className={`select${values.category ? '' : ' select--placeholder'}`}>
                      <option value="">Select...</option>
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </fieldset>

              <fieldset className="form-section">
                <legend className="form-section__title">Personal details</legend>
                <div className="form-grid">
                  <Field id="name" label="Full Name" error={errorFor('name')} full>
                    <input
                      {...fieldProps('name')}
                      className="input"
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. Priya Sharma"
                      maxLength={NAME_MAX}
                    />
                  </Field>

                  <Field id="email" label="Email" error={errorFor('email')}>
                    <input
                      {...fieldProps('email')}
                      className="input"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      maxLength={254}
                    />
                  </Field>

                  <Field id="phone" label="Phone Number" error={errorFor('phone')} hint="10-15 digits, country code optional">
                    <input
                      {...fieldProps('phone')}
                      className="input"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+91 98765 43210"
                      maxLength={24}
                    />
                  </Field>
                </div>
              </fieldset>

              <fieldset className="form-section">
                <legend className="form-section__title">Your question</legend>
                <Field
                  id="message"
                  label="Message / Query"
                  error={errorFor('message')}
                  hint="At least 10 characters"
                  counter={`${values.message.trim().length}/${MESSAGE_MAX}`}
                  full
                >
                  <textarea
                    {...fieldProps('message')}
                    className="textarea"
                    rows={6}
                    maxLength={MESSAGE_MAX}
                    placeholder="Tell us what you would like to know..."
                  />
                </Field>
              </fieldset>

              <div className="form-actions">
                <p className="form-actions__note">We only use your details to respond to this inquiry.</p>
                <button type="submit" className="btn btn--primary btn--lg" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="spinner" aria-hidden="true" /> Submitting...
                    </>
                  ) : (
                    'Submit Inquiry'
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>

        <aside className="card info-card" aria-labelledby="topics-title">
          <div className="card__body">
            <h2 id="topics-title" className="info-card__title">
              What can you ask about?
            </h2>
            <ul className="topic-list">
              {TOPICS.map((topic) => (
                <li key={topic.category} className="topic-list__item">
                  <span className={`badge badge--cat-${slugify(topic.category)}`}>{topic.category}</span>
                  <p>{topic.text}</p>
                </li>
              ))}
            </ul>
            <div className="info-card__footer">
              <strong>Response time</strong>
              <p>Most inquiries are answered within 24-48 hours on working days.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
