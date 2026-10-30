import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LOGIN_PATH, api, clearSession, getAdmin } from '../api/client.js';
import { CATEGORIES, STATUSES, USER_TYPES, slugify } from '../constants.js';

const SEARCH_DEBOUNCE_MS = 400;
const MESSAGE_PREVIEW_LENGTH = 60;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "30 Oct 2026, 6:47 PM" in the viewer's local time zone.
function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours < 12 ? 'AM' : 'PM';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${hours % 12 || 12}:${minutes} ${period}`;
}

function truncate(text, max = MESSAGE_PREVIEW_LENGTH) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

const Icon = ({ children, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const SearchIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);
const RefreshIcon = () => (
  <Icon>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </Icon>
);
const LogoutIcon = () => (
  <Icon>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </Icon>
);
const InboxIcon = () => (
  <Icon size={22}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </Icon>
);
const CloseIcon = () => (
  <Icon size={18}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Icon>
);

function StatusSelect({ inquiry, disabled, onChange }) {
  return (
    <select
      className={`status-select status-select--${slugify(inquiry.status)}`}
      value={inquiry.status}
      disabled={disabled}
      onChange={(event) => onChange(inquiry.id, event.target.value)}
      aria-label={`Status for ${inquiry.name}`}
    >
      {STATUSES.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}

function InquiryModal({ inquiry, updating, onStatusChange, onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="inquiry-modal-title">
        <div className="modal__header">
          <div>
            <h2 id="inquiry-modal-title" className="modal__title">
              {inquiry.name}
            </h2>
            <p className="modal__subtitle">Submitted {formatDate(inquiry.createdAt)}</p>
          </div>
          <button ref={closeButtonRef} type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="modal__body">
          <dl className="detail-grid">
            <div>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
              </dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>
                <a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a>
              </dd>
            </div>
            <div>
              <dt>User Type</dt>
              <dd>
                <span className={`badge badge--type-${slugify(inquiry.userType)}`}>{inquiry.userType}</span>
              </dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>
                <span className={`badge badge--cat-${slugify(inquiry.category)}`}>{inquiry.category}</span>
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusSelect inquiry={inquiry} disabled={updating} onChange={onStatusChange} />
              </dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{formatDate(inquiry.updatedAt)}</dd>
            </div>
          </dl>
          <p className="detail-label">Message</p>
          <div className="message-box">{inquiry.message}</div>
        </div>

        <div className="modal__footer">
          <a
            className="btn btn--secondary"
            href={`mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: Your ${inquiry.category} inquiry`)}`}
          >
            Reply by email
          </a>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(getAdmin);

  const [category, setCategory] = useState('');
  const [userType, setUserType] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [updatingId, setUpdatingId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  // Confirms the token with the server (a 401 redirects to login) and refreshes the profile.
  useEffect(() => {
    api
      .me()
      .then(({ admin: profile }) => setAdmin(profile))
      .catch(() => {});
  }, []);

  // Debounce typing in the search box.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Filtering happens server-side: refetch whenever a filter changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    api
      .getInquiries({ category, userType, search })
      .then((result) => {
        if (cancelled) return;
        setRows(result.data);
        setTotal(result.total);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category, userType, search, reloadKey]);

  const counts = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }),
        Object.fromEntries(STATUSES.map((status) => [status, 0])),
      ),
    [rows],
  );

  const selected = rows.find((row) => row.id === selectedId) || null;
  const filtersApplied = Boolean(category || userType || search);
  const canClear = Boolean(category || userType || searchInput);

  const closeModal = useCallback(() => setSelectedId(null), []);
  const reload = () => setReloadKey((key) => key + 1);

  function clearFilters() {
    setCategory('');
    setUserType('');
    setSearchInput('');
    setSearch('');
  }

  function handleLogout() {
    clearSession();
    navigate(LOGIN_PATH, { replace: true });
  }

  const handleStatusChange = useCallback(async (id, status) => {
    setUpdatingId(id);
    setActionError('');
    try {
      const { data } = await api.updateInquiryStatus(id, status);
      setRows((prev) => prev.map((row) => (row.id === id ? data : row)));
    } catch (err) {
      setActionError(`Couldn't update the status: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  }, []);

  let content;
  if (error) {
    content = (
      <div className="state">
        <div className="state__icon state__icon--error" aria-hidden="true">
          !
        </div>
        <p className="state__title">Couldn&apos;t load inquiries</p>
        <p>{error}</p>
        <button type="button" className="btn btn--secondary" onClick={reload}>
          Try again
        </button>
      </div>
    );
  } else if (loading && rows.length === 0) {
    content = (
      <div className="state" aria-live="polite">
        <span className="spinner spinner--lg" aria-hidden="true" />
        <p>Loading inquiries...</p>
      </div>
    );
  } else if (rows.length === 0) {
    content = (
      <div className="state">
        <div className="state__icon" aria-hidden="true">
          <InboxIcon />
        </div>
        {filtersApplied ? (
          <>
            <p className="state__title">No inquiries match your filters</p>
            <p>Try a different category, user type or search term.</p>
            <button type="button" className="btn btn--secondary" onClick={clearFilters}>
              Clear filters
            </button>
          </>
        ) : (
          <>
            <p className="state__title">No inquiries yet</p>
            <p>New submissions from the public inquiry form will appear here.</p>
          </>
        )}
      </div>
    );
  } else {
    content = (
      <div className={`table-wrap${loading ? ' table-wrap--loading' : ''}`}>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Phone</th>
              <th scope="col">Email</th>
              <th scope="col">User Type</th>
              <th scope="col">Category</th>
              <th scope="col">Date</th>
              <th scope="col">Status</th>
              <th scope="col">Message</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="cell-strong">{row.name}</td>
                <td className="cell-nowrap">
                  <a href={`tel:${row.phone}`}>{row.phone}</a>
                </td>
                <td>
                  <a href={`mailto:${row.email}`}>{row.email}</a>
                </td>
                <td>
                  <span className={`badge badge--type-${slugify(row.userType)}`}>{row.userType}</span>
                </td>
                <td>
                  <span className={`badge badge--cat-${slugify(row.category)}`}>{row.category}</span>
                </td>
                <td className="cell-nowrap cell-muted">{formatDate(row.createdAt)}</td>
                <td>
                  <StatusSelect inquiry={row} disabled={updatingId === row.id} onChange={handleStatusChange} />
                </td>
                <td>
                  <div className="cell-message">
                    <span className="cell-message__text" title={row.message}>
                      {truncate(row.message)}
                    </span>
                    <button type="button" className="btn btn--link" onClick={() => setSelectedId(row.id)}>
                      View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const stats = [
    { key: 'total', label: 'Total', value: total },
    ...STATUSES.map((status) => ({ key: slugify(status), label: status, value: counts[status] })),
  ];

  return (
    <div className="dashboard">
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Inquiries</h1>
          <p className="page-header__meta">
            Signed in as <strong>{admin?.email || 'admin'}</strong>
          </p>
        </div>
        <div className="page-header__actions">
          <button type="button" className="btn btn--secondary" onClick={reload} disabled={loading}>
            <RefreshIcon /> Refresh
          </button>
          <button type="button" className="btn btn--danger" onClick={handleLogout}>
            <LogoutIcon /> Logout
          </button>
        </div>
      </header>

      <section className="stats" aria-label={filtersApplied ? 'Summary of filtered results' : 'Summary'}>
        {stats.map((stat) => (
          <div key={stat.key} className={`card stat stat--${stat.key}`}>
            <p className="stat__label">{stat.label}</p>
            <p className="stat__value">{loading && rows.length === 0 ? '–' : stat.value}</p>
          </div>
        ))}
      </section>

      <section className="card filters" aria-label="Filters">
        <div className="field filters__search">
          <label htmlFor="filter-search">Search</label>
          <div className="search-input">
            <SearchIcon />
            <input
              id="filter-search"
              type="search"
              className="input"
              placeholder="Search by name or phone"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              maxLength={100}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="filter-category">Category</label>
          <select id="filter-category" className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All</option>
            {CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="filter-user-type">User Type</label>
          <select id="filter-user-type" className="select" value={userType} onChange={(event) => setUserType(event.target.value)}>
            <option value="">All</option>
            {USER_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="filters__actions">
          <button type="button" className="btn btn--ghost" onClick={clearFilters} disabled={!canClear}>
            Clear filters
          </button>
        </div>
      </section>

      {actionError && (
        <div className="alert alert--error" role="alert">
          <span className="alert__icon" aria-hidden="true">
            !
          </span>
          <span className="alert__text">{actionError}</span>
          <button type="button" className="alert__close" onClick={() => setActionError('')} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <section className="card results" aria-label="Inquiries">
        <div className="results-bar">
          <p className="results-count" aria-live="polite">
            {loading && rows.length === 0 ? (
              'Loading...'
            ) : (
              <>
                {total} {total === 1 ? 'inquiry' : 'inquiries'}
                {filtersApplied && <span> matching current filters</span>}
              </>
            )}
          </p>
          {loading && rows.length > 0 && (
            <span className="results-bar__loading">
              <span className="spinner" aria-hidden="true" /> Updating
            </span>
          )}
        </div>
        {content}
      </section>

      {selected && (
        <InquiryModal
          inquiry={selected}
          updating={updatingId === selected.id}
          onStatusChange={handleStatusChange}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
