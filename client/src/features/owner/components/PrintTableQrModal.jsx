import { useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import QRCode from 'qrcode'

const QUIET_ZONE = 2

function QrCodeSvg({ value, label }) {
  const { viewBoxSize, pathData } = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' })
    const count = qr.modules.size
    const commands = []

    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (qr.modules.get(row, col)) {
          const x = col + QUIET_ZONE
          const y = row + QUIET_ZONE
          commands.push(`M${x},${y}h1v1h-1z`)
        }
      }
    }

    return {
      viewBoxSize: count + QUIET_ZONE * 2,
      pathData: commands.join(''),
    }
  }, [value])

  return (
    <svg
      className="tent-qr-svg"
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`QR code for ${label}`}
    >
      <rect width={viewBoxSize} height={viewBoxSize} fill="#FFFFFF" />
      <path d={pathData} fill="#050505" />
    </svg>
  )
}

QrCodeSvg.propTypes = {
  value: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
}

function getCustomerUrl(table) {
  if (table.customerUrl) return table.customerUrl
  return `${window.location.origin}/t/${encodeURIComponent(table.tableCode)}`
}

export function PrintTableQrModal({ isOpen, onClose, tables, mode }) {
  useEffect(() => {
    if (!isOpen || !tables || tables.length === 0) return undefined
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, tables, onClose])

  if (!isOpen || !tables || tables.length === 0) return null

  const isBatch = mode === 'all' || tables.length > 1

  function handlePrint() {
    window.print()
  }

  return (
    <div className="modal-overlay print-modal-overlay" onClick={onClose}>
      <div
        className={`modal-dialog print-modal-dialog ${isBatch ? 'modal-dialog--print-wide' : 'modal-dialog--wide'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-qr-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="print-modal-header no-print">
          <div>
            <span className="editorial-eyebrow">Table Tent Presentation</span>
            <h2 id="print-qr-modal-title" className="modal-title" style={{ marginBottom: 0 }}>
              {isBatch
                ? `Printable Tent Cards (${tables.length})`
                : `${tables[0].label} — QR Tent Card`}
            </h2>
          </div>
          <button type="button" className="quiet-link" onClick={onClose}>
            Close
          </button>
        </div>

        <div className={`tent-card-grid ${isBatch ? 'tent-card-grid--batch' : 'tent-card-grid--single'}`}>
          {tables.map((table) => {
            const customerUrl = getCustomerUrl(table)
            return (
              <article key={table.id} className="tent-card">
                <div className="tent-card-inner">
                  <header className="tent-card-brand">
                    <span className="tent-brand-wordmark">MESA</span>
                    <span className="tent-brand-script">&middot; atelier &middot;</span>
                  </header>

                  <div className="tent-card-heading">
                    <span className="tent-card-eyebrow">Table</span>
                    <strong className="tent-card-title">{table.label}</strong>
                  </div>

                  <div className="tent-qr-frame">
                    <QrCodeSvg value={customerUrl} label={table.label} />
                  </div>

                  <p className="tent-card-instructions">
                    Scan with your smartphone camera
                    <br />
                    to browse menu and order from table
                  </p>

                  <footer className="tent-card-footer">
                    <span className="tent-code-id">CODE IDENTIFIER: {table.tableCode}</span>
                    <span className="tent-url-caption">{customerUrl}</span>
                  </footer>
                </div>
              </article>
            )
          })}
        </div>

        <div className="modal-actions no-print">
          <button type="button" className="quiet-button" onClick={onClose}>
            Close
          </button>
          <button type="button" className="primary-button" onClick={handlePrint}>
            {isBatch ? `Print ${tables.length} Tent Cards` : 'Print Tent Card'}
          </button>
        </div>
      </div>
    </div>
  )
}

PrintTableQrModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  tables: PropTypes.array.isRequired,
  mode: PropTypes.oneOf(['single', 'all']),
}
