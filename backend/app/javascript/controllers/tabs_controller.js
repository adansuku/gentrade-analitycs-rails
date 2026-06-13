import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="tabs"
export default class extends Controller {
  static targets = ["tab", "panel"]
  static values = { active: String }

  connect() {
    // Activate first tab by default if no active value
    if (!this.hasActiveValue) {
      this.activeValue = this.tabTargets[0]?.dataset.tab || ""
    }
    this.showActiveTab()
  }

  switch(event) {
    event.preventDefault()
    const tabName = event.currentTarget.dataset.tab
    this.activeValue = tabName
    this.showActiveTab()
  }

  showActiveTab() {
    // Update tab buttons
    this.tabTargets.forEach(tab => {
      const isActive = tab.dataset.tab === this.activeValue

      if (isActive) {
        tab.classList.add("active", "border-[#1b5e3b]", "text-[#1b5e3b]")
        tab.classList.remove("text-gray-600", "border-transparent")
      } else {
        tab.classList.remove("active", "border-[#1b5e3b]", "text-[#1b5e3b]")
        tab.classList.add("text-gray-600", "border-transparent")
      }
    })

    // Update panels
    this.panelTargets.forEach(panel => {
      const panelName = panel.dataset.tabPanel

      if (panelName === this.activeValue) {
        panel.classList.remove("hidden")
      } else {
        panel.classList.add("hidden")
      }
    })
  }
}
