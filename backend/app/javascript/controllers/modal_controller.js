import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="modal"
export default class extends Controller {
  connect() {
    // Add escape key listener
    this.escapeListener = this.handleEscape.bind(this)
    document.addEventListener("keydown", this.escapeListener)

    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden"
  }

  disconnect() {
    // Remove escape key listener
    document.removeEventListener("keydown", this.escapeListener)

    // Restore body scroll
    document.body.style.overflow = ""
  }

  handleEscape(event) {
    if (event.key === "Escape") {
      this.close(event)
    }
  }

  close(event) {
    // Prevent default if it's a click event on the backdrop
    if (event) {
      // Only close if clicking the backdrop (not the modal content)
      if (event.target === this.element) {
        event.preventDefault()
        this.element.remove()
      } else if (event.key === "Escape") {
        event.preventDefault()
        this.element.remove()
      }
    }
  }

  // Prevent closing when clicking inside the modal
  preventClose(event) {
    event.stopPropagation()
  }
}
