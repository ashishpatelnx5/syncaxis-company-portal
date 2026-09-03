import Icon from './Icon'

export default function PhotoLightbox({ src, alt, onClose }) {
  return (
    <div className="modal-scrim lightbox-scrim" onClick={onClose}>
      <button type="button" className="modal-close lightbox-close" onClick={onClose} aria-label="Close">
        <Icon name="close" size={18} />
      </button>
      <img src={src} alt={alt} className="lightbox-img" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}
