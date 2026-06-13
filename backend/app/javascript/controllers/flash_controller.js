import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="flash"
export default class extends Controller {
  connect() {
    // Auto-hide flash message after 5 seconds
    this.timeout = setTimeout(() => {
      this.hide()
    }, 5000)
  }

  disconnect() {
    // Clear timeout if element is removed before timeout
    if (this.timeout) {
      clearTimeout(this.timeout)
    }
  }

  hide() {
    // Fade out animation
    this.element.style.transition = "opacity 0.3s ease-out"
    this.element.style.opacity = "0"

    // Remove element after animation
    setTimeout(() => {
      this.element.remove()
    }, 300)
  }

  // Allow manual close
  close(event) {
    event.preventDefault()
    this.hide()
  }
}
