import { Controller } from "@hotwired/stimulus"

// Búsqueda semántica (RAG) en materiales: consulta el endpoint /search,
// y filtra/reordena las filas de materiales por relevancia. Vacío = restaura.
export default class extends Controller {
  static targets = ["input", "status"]
  static values = { url: String }

  connect() {
    this.debounce = null
  }

  search() {
    clearTimeout(this.debounce)
    const query = this.inputTarget.value.trim()

    if (query === "") {
      this._restore()
      return
    }

    this.debounce = setTimeout(() => this._run(query), 400)
  }

  async _run(query) {
    this._setStatus("Buscando…")
    try {
      const res = await fetch(`${this.urlValue}?q=${encodeURIComponent(query)}`, {
        headers: { Accept: "application/json" }
      })
      const data = await res.json()
      this._applyResults(data.results || [])
    } catch (e) {
      this._setStatus("Error")
    }
  }

  _applyResults(results) {
    const ids = results.map((r) => String(r.id))

    // Filtra: muestra solo los materiales presentes en los resultados.
    const allRows = this.element.querySelectorAll("[data-material-type]")
    allRows.forEach((row) => {
      const match = ids.includes(String(row.dataset.materialId))
      row.style.display = match ? "" : "none"
    })

    // Oculta los encabezados de grupo que queden vacíos.
    this.element.querySelectorAll("[data-material-group]").forEach((group) => {
      const visible = [...group.querySelectorAll("[data-material-type]")].some((r) => r.style.display !== "none")
      group.style.display = visible ? "" : "none"
    })

    this._setStatus(`${results.length} resultado${results.length === 1 ? "" : "s"}`)
  }

  _restore() {
    clearTimeout(this.debounce)
    this.element.querySelectorAll("[data-material-type]").forEach((r) => { r.style.display = "" })
    this.element.querySelectorAll("[data-material-group]").forEach((g) => { g.style.display = "" })
    this._hideStatus()
  }

  _setStatus(text) {
    if (!this.hasStatusTarget) return
    this.statusTarget.textContent = text
    this.statusTarget.classList.remove("hidden")
  }

  _hideStatus() {
    if (this.hasStatusTarget) this.statusTarget.classList.add("hidden")
  }
}
