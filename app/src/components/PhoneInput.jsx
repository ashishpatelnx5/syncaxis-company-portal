// India-only company - a fixed "+91" prefix rather than a full country-code
// picker. Only the digits are stored (matches the existing Phone/
// EmergencyContactPhone columns, which predate this and hold bare numbers).
export default function PhoneInput({ label, value, onChange, disabled }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <div className="phone-input">
        <span className="phone-input-prefix">+91</span>
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value.replace(/\D/g, '').slice(0, 10))}
          inputMode="numeric"
          maxLength={10}
          disabled={disabled}
        />
      </div>
    </label>
  )
}
