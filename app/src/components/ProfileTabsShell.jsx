import { useState } from 'react'
import Icon from './Icon'

// Pure layout/navigation - each caller (MyProfile.jsx, EmployeeForm.jsx)
// builds its own tab content (including its own edit/save state) and just
// hands it an array of {key, label, content} to arrange into tabs with
// Next/Previous. No data logic lives here.
export default function ProfileTabsShell({ tabs }) {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <div className="profile-tabs">
      <div className="tab-strip" style={{ maxWidth: 'none', margin: '0 0 20px' }}>
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-link ${index === activeIndex ? 'active' : ''}`}
            onClick={() => setActiveIndex(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="profile-tab-content">{tabs[activeIndex].content}</div>

      <div className="profile-tabs-nav">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
          disabled={activeIndex === 0}
        >
          <Icon name="chevron" size={14} className="icon-flip" /> Previous
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setActiveIndex((i) => Math.min(tabs.length - 1, i + 1))}
          disabled={activeIndex === tabs.length - 1}
        >
          Next <Icon name="chevron" size={14} />
        </button>
      </div>
    </div>
  )
}
