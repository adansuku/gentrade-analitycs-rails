import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["filterBar", "allChip", "typeChip", "fileInput", "uploadProgress", "uploadMessage"]

  connect() {
    this.activeFilter = null
  }

  // ── Filtro por tipo ──────────────────────────────────────────────────────

  filterAll() {
    this.activeFilter = null
    this._applyFilter()
  }

  filterType(event) {
    const type = event.currentTarget.dataset.type
    this.activeFilter = this.activeFilter === type ? null : type
    this._applyFilter()
  }

  _applyFilter() {
    const rows = this.element.querySelectorAll("[data-material-type]")
    const groups = this.element.querySelectorAll("[data-material-group]")

    rows.forEach(row => {
      const show = !this.activeFilter || row.dataset.materialType === this.activeFilter
      row.style.display = show ? "" : "none"
    })

    groups.forEach(group => {
      const hasVisible = [...group.querySelectorAll("[data-material-type]")].some(r => r.style.display !== "none")
      group.style.display = hasVisible ? "" : "none"
    })

    // Update chip styles
    if (this.hasAllChipTarget) {
      this.allChipTarget.classList.toggle("bg-[#1b5e3b]", !this.activeFilter)
      this.allChipTarget.classList.toggle("text-white", !this.activeFilter)
      this.allChipTarget.classList.toggle("bg-gray-100", !!this.activeFilter)
      this.allChipTarget.classList.toggle("text-gray-600", !!this.activeFilter)
    }

    if (this.hasTypeChipTarget) {
      this.typeChipTargets.forEach(chip => {
        const active = chip.dataset.type === this.activeFilter
        chip.classList.toggle("opacity-100", active)
        chip.classList.toggle("opacity-70", !active)
        chip.classList.toggle("ring-2", active)
        chip.classList.toggle("ring-offset-1", active)
        chip.classList.toggle("ring-current", active)
      })
    }
  }

  // ── Upload de archivo ────────────────────────────────────────────────────

  uploadFile(event) {
    const file = event.target.files[0]
    if (!file) return

    const uploadUrl = event.target.dataset.uploadUrl
    if (!uploadUrl) return

    this._showProgress("Subiendo archivo...")

    const formData = new FormData()
    formData.append("file", file)

    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content

    fetch(uploadUrl, {
      method: "POST",
      headers: {
        "X-CSRF-Token": csrfToken,
        "Accept": "text/vnd.turbo-stream.html"
      },
      body: formData
    })
    .then(res => {
      if (!res.ok) throw new Error("Error al subir el archivo")
      return res.text()
    })
    .then(html => {
      this._hideProgress()
      // Apply turbo stream response
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, "text/html")
      // Turbo handles turbo-stream elements automatically
      Turbo.renderStreamMessage(html)
      event.target.value = ""
    })
    .catch(err => {
      this._hideProgress()
      alert(err.message)
      event.target.value = ""
    })
  }

  _showProgress(message) {
    if (this.hasUploadProgressTarget) {
      this.uploadProgressTarget.classList.remove("hidden")
      if (this.hasUploadMessageTarget) this.uploadMessageTarget.textContent = message
    }
  }

  _hideProgress() {
    if (this.hasUploadProgressTarget) {
      this.uploadProgressTarget.classList.add("hidden")
    }
  }

  // ── Viewer de contenido ──────────────────────────────────────────────────

  openViewer(event) {
    // Don't open viewer when clicking the delete button
    if (event.target.closest("form")) return

    const row = event.currentTarget
    this._renderViewer({
      title: row.dataset.materialTitle,
      type: row.dataset.materialType,
      typeLabel: row.dataset.materialTypeLabel,
      content: row.dataset.materialContent,
      fileUrl: row.dataset.materialFileUrl,
      fileMime: row.dataset.materialFileMime
    })
  }

  _renderViewer({ title, type, typeLabel, content, fileUrl, fileMime }) {
    const existing = document.getElementById("material-viewer-overlay")
    if (existing) existing.remove()

    const overlay = document.createElement("div")
    overlay.id = "material-viewer-overlay"
    overlay.className = "fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    overlay.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 class="text-base font-semibold text-gray-900">${this._escape(title)}</h3>
            <span class="text-xs text-gray-400">${this._escape(typeLabel)}</span>
          </div>
          <button type="button" id="close-viewer" class="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex-1 overflow-auto px-6 py-4">
          ${this._viewerBody({ type, content, fileUrl, fileMime })}
        </div>
      </div>
    `

    document.body.appendChild(overlay)

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove()
    })
    document.getElementById("close-viewer").addEventListener("click", () => overlay.remove())

    document.addEventListener("keydown", function closeOnEsc(e) {
      if (e.key === "Escape") { overlay.remove(); document.removeEventListener("keydown", closeOnEsc) }
    })
  }

  // Renderiza el cuerpo del viewer según el tipo de material.
  _viewerBody({ type, content, fileUrl, fileMime }) {
    const textBlock = content
      ? `<pre class="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">${this._escape(content)}</pre>`
      : ""

    // Audio: reproductor + transcripción (si hay texto).
    if (type === "audio") {
      const player = fileUrl
        ? `<audio controls preload="metadata" class="w-full mb-4"><source src="${this._escape(fileUrl)}"></audio>`
        : `<p class="text-sm text-gray-400 mb-4">No hay archivo de audio disponible.</p>`
      const transcript = content
        ? `<div class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Transcripción / contenido</div>${textBlock}`
        : `<p class="text-sm text-gray-400">Sin transcripción todavía.</p>`
      return player + transcript
    }

    // PDF: embed.
    if (type === "pdf" && fileUrl) {
      return `<iframe src="${this._escape(fileUrl)}" class="w-full h-[65vh] rounded-lg border border-gray-200"></iframe>`
    }

    // Imágenes.
    if (fileMime && fileMime.startsWith("image/") && fileUrl) {
      return `<img src="${this._escape(fileUrl)}" alt="" class="max-w-full mx-auto rounded-lg">`
    }

    // Texto / nota / transcript / email / csv: muestra el contenido extraído.
    if (content) {
      let body = textBlock
      if (fileUrl) {
        body += `<div class="mt-4"><a href="${this._escape(fileUrl)}" target="_blank" rel="noopener" class="text-sm text-[#1b5e3b] underline">Abrir archivo original</a></div>`
      }
      return body
    }

    // Sin texto pero con archivo (docx/xlsx binarios): enlace de descarga.
    if (fileUrl) {
      return `
        <div class="text-center py-8">
          <p class="text-sm text-gray-500 mb-4">Vista previa no disponible para este tipo de archivo.</p>
          <a href="${this._escape(fileUrl)}" target="_blank" rel="noopener"
             class="inline-flex items-center gap-2 px-4 py-2 bg-[#1b5e3b] text-white rounded-lg text-sm font-semibold hover:bg-[#2a7d54] transition-colors">
            Descargar / abrir archivo
          </a>
        </div>`
    }

    return `<p class="text-sm text-gray-400 text-center py-8">Este material no tiene contenido.</p>`
  }

  _escape(str) {
    return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }
}
