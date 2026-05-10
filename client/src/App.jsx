import { useEffect, useMemo, useState } from 'react'
import './App.css'

const initialForm = {
  subject: '',
  body: '',
  recipients: '',
}

function parseRecipients(value) {
  return Array.from(
    new Set(
      value
        .split(/[\n,;]/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  )
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function App() {
  const [form, setForm] = useState(initialForm)
  const [history, setHistory] = useState([])
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)

  const recipientList = useMemo(() => parseRecipients(form.recipients), [form.recipients])

  async function loadHistory() {
    try {
      const response = await fetch('/api/emails/history')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to fetch email history.')
      }

      setHistory(data.history)
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to fetch email history.',
      })
    } finally {
      setIsHistoryLoading(false)
    }
  }

  useEffect(() => {
    async function fetchHistoryOnMount() {
      await loadHistory()
    }

    fetchHistoryOnMount()
  }, [])

  async function handleRefreshHistory() {
    setIsHistoryLoading(true)
    await loadHistory()
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!form.subject.trim() || !form.body.trim() || recipientList.length === 0) {
      setStatus({
        type: 'error',
        message: 'Please add a subject, email body, and at least one recipient.',
      })
      return
    }

    setIsSubmitting(true)
    setStatus({ type: '', message: '' })

    try {
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: form.subject,
          body: form.body,
          recipients: recipientList,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to send email.')
      }

      setStatus({
        type: data.email.status === 'partial' ? 'warning' : 'success',
        message: data.message,
      })
      setForm(initialForm)
      setHistory((current) => [data.email, ...current].slice(0, 20))
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Unable to send email.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Bulk Mail App</p>
          <h1>Send campaign emails from one dashboard.</h1>
          <p className="hero-copy">
            Compose a message, target multiple recipients, and keep a delivery history backed by
            MongoDB.
          </p>
        </div>
        <div className="stats-grid">
          <article>
            <strong>{recipientList.length}</strong>
            <span>Recipients ready</span>
          </article>
          <article>
            <strong>{history.length}</strong>
            <span>Recent campaigns</span>
          </article>
          <article>
            <strong>Vercel</strong>
            <span>Ready deployment</span>
          </article>
        </div>
      </section>

      <section className="content-grid">
        <form className="panel compose-panel" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div>
              <p className="section-tag">Compose</p>
              <h2>New bulk email</h2>
            </div>
            <span className="chip">{recipientList.length} recipients</span>
          </div>

          <label>
            Subject
            <input
              name="subject"
              value={form.subject}
              onChange={handleChange}
              type="text"
              placeholder="Launch update, weekly digest, promo offer..."
            />
          </label>

          <label>
            Email body
            <textarea
              name="body"
              value={form.body}
              onChange={handleChange}
              rows="8"
              placeholder="Write the message you want to send..."
            />
          </label>

          <label>
            Recipient emails
            <textarea
              name="recipients"
              value={form.recipients}
              onChange={handleChange}
              rows="7"
              placeholder="Enter emails separated by commas, semicolons, or new lines"
            />
          </label>

          <div className="helper-row">
            <p>Duplicates are removed automatically before the email is sent.</p>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send bulk email'}
            </button>
          </div>

          {status.message ? (
            <div className={`status-banner ${status.type || 'info'}`}>{status.message}</div>
          ) : null}
        </form>

        <section className="panel history-panel">
          <div className="panel-heading">
            <div>
              <p className="section-tag">History</p>
              <h2>Sent email records</h2>
            </div>
            <button type="button" className="secondary-button" onClick={handleRefreshHistory}>
              Refresh
            </button>
          </div>

          {isHistoryLoading ? <p>Loading history...</p> : null}

          {!isHistoryLoading && history.length === 0 ? (
            <p>No email campaigns found yet. Send your first one from the form.</p>
          ) : null}

          <div className="history-list">
            {history.map((item) => (
              <article className="history-card" key={item._id}>
                <div className="history-top-row">
                  <h3>{item.subject}</h3>
                  <span className={`status-pill ${item.status}`}>{item.status}</span>
                </div>
                <p className="history-meta">{formatDate(item.createdAt)}</p>
                <p className="history-body">{item.body}</p>
                <p className="history-meta">
                  {item.successCount} sent, {item.failureCount} failed
                </p>
                <p className="history-recipients">{item.recipients.join(', ')}</p>
                {item.failedRecipients?.length ? (
                  <p className="history-error">Failed: {item.failedRecipients.join(', ')}</p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
