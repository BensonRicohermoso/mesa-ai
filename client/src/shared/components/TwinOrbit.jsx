import PropTypes from 'prop-types'
import './TwinOrbit.css'

export function TwinOrbit({ size = '1rem', label = 'Loading' }) {
  return (
    <span className="twin-orbit" role="status" aria-label={label} style={{ '--twin-orbit-size': size }}>
      <span aria-hidden="true" className="twin-orbit__satellite" />
      <span aria-hidden="true" className="twin-orbit__satellite twin-orbit__satellite--delayed" />
      <span className="twin-orbit__sr">{label}</span>
    </span>
  )
}

TwinOrbit.propTypes = {
  size: PropTypes.string,
  label: PropTypes.string,
}
