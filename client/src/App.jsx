import { useMemo, useRef, useState } from 'react'
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

function extractEmailsFromText(value) {
  return Array.from(
    new Set(
      (value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  )
}

function App() {
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const recipientList = useMemo(() => parseRecipients(form.recipients), [form.recipients])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleFileSelection(event) {
    const [file] = event.target.files || []

    if (!file) {
      return
    }

    const fileText = await file.text()
    const extractedEmails = extractEmailsFromText(fileText)

    if (extractedEmails.length === 0) {
      setStatus({
        type: 'error',
        message: 'No valid email addresses were found in the uploaded file.',
      })
      return
    }

    setForm((current) => {
      const mergedRecipients = Array.from(
        new Set([...parseRecipients(current.recipients), ...extractedEmails])
      )

      return {
        ...current,
        recipients: mergedRecipients.join(', '),
      }
    })

    setStatus({
      type: 'success',
      message: `${extractedEmails.length} recipient emails imported from ${file.name}.`,
    })

    event.target.value = ''
  }

  function handleDragOver(event) {
    event.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(event) {
    event.preventDefault()
    setIsDragging(false)
  }

  async function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)

    const [file] = event.dataTransfer.files || []

    if (!file) {
      return
    }

    const fileText = await file.text()
    const extractedEmails = extractEmailsFromText(fileText)

    if (extractedEmails.length === 0) {
      setStatus({
        type: 'error',
        message: 'No valid email addresses were found in the dropped file.',
      })
      return
    }

    setForm((current) => {
      const mergedRecipients = Array.from(
        new Set([...parseRecipients(current.recipients), ...extractedEmails])
      )

      return {
        ...current,
        recipients: mergedRecipients.join(', '),
      }
    })

    setStatus({
      type: 'success',
      message: `${extractedEmails.length} recipient emails imported from ${file.name}.`,
    })
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
            Compose a message, import recipients, and send bulk emails from a single screen.
          </p>
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

          <div className="stats-grid form-stats-grid">
            <article>
              <strong>{recipientList.length}</strong>
              <span>Recipients ready</span>
            </article>
            <article
              className={`upload-card ${isDragging ? 'drag-active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                className="file-input"
                type="file"
                accept=".txt,.csv"
                onChange={handleFileSelection}
              />
              <strong>Import recipients</strong>
              <button
                type="button"
                className="upload-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                Drag and Drop your file here
              </button>
              <span>Upload a `.txt` or `.csv` file with email addresses.</span>
            </article>
          </div>

          {status.message ? (
            <div className={`status-banner ${status.type || 'info'}`}>{status.message}</div>
          ) : null}
        </form>
      </section>
    </main>
  )
}

export default App
