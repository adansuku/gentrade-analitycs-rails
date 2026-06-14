import { Controller } from "@hotwired/stimulus"

// Picker navegable de Google Drive: lista archivos/carpetas, busca, navega
// carpetas e importa con un clic. Usa los endpoints /drive/files y
// /clients/:id/drive/import. Si el usuario no tiene Drive conectado, lanza OAuth.
export default class extends Controller {
  static values = {
    authUrl: String,
    statusUrl: String,
    filesUrl: String,
    importUrl: String
  }

  async open() {
    try {
      const status = await this._json(this.statusUrlValue)
      if (!status.connected) {
        await this._connect()
        return
      }
      this.folderStack = []
      this.query = ""
      this._renderModal()
      this._loadFiles()
    } catch (e) {
      window.alert("No se pudo contactar con Google Drive. Inténtalo de nuevo.")
    }
  }

  async _connect() {
    // Pasa la ruta actual para volver aquí tras conectar.
    const returnTo = window.location.pathname + window.location.search
    const url = `${this.authUrlValue}?return_to=${encodeURIComponent(returnTo)}`
    const data = await this._json(url)
    if (data.auth_url) {
      window.location.href = data.auth_url
    } else {
      window.alert("No se pudo iniciar la conexión con Google Drive.")
    }
  }

  // ── Carga de archivos ──────────────────────────────────────────────────────

  async _loadFiles() {
    const list = this.modal.querySelector("[data-role=list]")
    list.innerHTML = `<div class="drive-loading">Cargando archivos…</div>`

    const params = new URLSearchParams()
    const folderId = this.folderStack.at(-1)?.id
    if (folderId) params.set("folder_id", folderId)
    if (this.query) params.set("query", this.query)

    try {
      const data = await this._json(`${this.filesUrlValue}?${params.toString()}`)
      this._renderFiles(data.files || [])
    } catch (e) {
      list.innerHTML = `<div class="drive-empty">Error al cargar archivos.</div>`
    }
  }

  _renderFiles(files) {
    const list = this.modal.querySelector("[data-role=list]")
    if (files.length === 0) {
      list.innerHTML = `<div class="drive-empty">No hay archivos compatibles aquí.</div>`
      return
    }

    list.innerHTML = files.map((f) => `
      <div class="drive-file-item" data-id="${f.id}" data-folder="${f.is_folder}" data-name="${this._escape(f.name)}">
        <div class="drive-file-icon">${f.is_folder ? "📁" : this._icon(f.mime_type)}</div>
        <div class="drive-file-info">
          <strong>${this._escape(f.name)}</strong>
          <span>${f.is_folder ? "Carpeta" : this._size(f.size)}</span>
        </div>
        <div class="drive-file-action">${f.is_folder ? "›" : "↓"}</div>
      </div>
    `).join("")

    list.querySelectorAll(".drive-file-item").forEach((row) => {
      row.addEventListener("click", () => this._onRowClick(row))
    })
  }

  _onRowClick(row) {
    const isFolder = row.dataset.folder === "true"
    if (isFolder) {
      this.folderStack.push({ id: row.dataset.id, name: row.dataset.name })
      this.query = ""
      this.modal.querySelector("[data-role=search]").value = ""
      this._updateBackButton()
      this._loadFiles()
    } else {
      this._importFile(row)
    }
  }

  async _importFile(row) {
    row.classList.add("importing")
    const action = row.querySelector(".drive-file-action")
    if (action) action.textContent = "…"

    try {
      const res = await fetch(this.importUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this._csrf(),
          Accept: "application/json"
        },
        body: JSON.stringify({ file_id: row.dataset.id })
      })
      if (!res.ok) throw new Error("import failed")
      if (action) action.textContent = "✓"
      // Refresca la lista de materiales recargando la página tras una breve pausa.
      setTimeout(() => window.location.reload(), 600)
    } catch (e) {
      row.classList.remove("importing")
      if (action) action.textContent = "↓"
      window.alert("No se pudo importar el archivo.")
    }
  }

  // ── Modal ──────────────────────────────────────────────────────────────────

  _renderModal() {
    this._closeModal()
    const overlay = document.createElement("div")
    overlay.className = "modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    overlay.innerHTML = `
      <div class="modal-content drive-picker-modal bg-white rounded-xl shadow-2xl w-full mx-4">
        <div class="modal-header flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 class="text-base font-semibold text-gray-900">Importar de Google Drive</h2>
          <button type="button" data-role="close" class="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>
        <div class="drive-search">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" data-role="search" placeholder="Buscar en Drive…">
        </div>
        <button type="button" data-role="back" class="drive-back-btn" style="display:none">‹ Volver</button>
        <div class="drive-file-list" data-role="list"></div>
      </div>
    `
    document.body.appendChild(overlay)
    this.modal = overlay

    overlay.querySelector("[data-role=close]").addEventListener("click", () => this._closeModal())
    overlay.addEventListener("click", (e) => { if (e.target === overlay) this._closeModal() })
    overlay.querySelector("[data-role=back]").addEventListener("click", () => this._goBack())

    let t
    overlay.querySelector("[data-role=search]").addEventListener("input", (e) => {
      clearTimeout(t)
      t = setTimeout(() => { this.query = e.target.value.trim(); this._loadFiles() }, 350)
    })
  }

  _goBack() {
    this.folderStack.pop()
    this._updateBackButton()
    this._loadFiles()
  }

  _updateBackButton() {
    const back = this.modal.querySelector("[data-role=back]")
    back.style.display = this.folderStack.length > 0 ? "flex" : "none"
    if (this.folderStack.length > 0) {
      back.textContent = `‹ ${this.folderStack.at(-1).name}`
    }
  }

  _closeModal() {
    if (this.modal) { this.modal.remove(); this.modal = null }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _json(url) {
    return fetch(url, { headers: { Accept: "application/json" } }).then((r) => r.json())
  }

  _csrf() {
    return document.querySelector("meta[name='csrf-token']")?.content
  }

  _icon(mime) {
    if (!mime) return "📄"
    if (mime.includes("pdf")) return "📕"
    if (mime.includes("audio")) return "🎵"
    if (mime.includes("spreadsheet") || mime.includes("excel")) return "📊"
    if (mime.includes("word") || mime.includes("document")) return "📝"
    return "📄"
  }

  _size(bytes) {
    if (!bytes) return ""
    const kb = bytes / 1024
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`
  }

  _escape(str) {
    return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }
}
