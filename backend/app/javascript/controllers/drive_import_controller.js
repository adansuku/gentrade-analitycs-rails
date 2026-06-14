import { Controller } from "@hotwired/stimulus"

// Inicia el flujo de importación desde Google Drive.
// Paso actual: comprueba si el usuario tiene Drive conectado; si no, lanza el
// OAuth. (El picker navegable de archivos se añadirá como paso de UI posterior.)
export default class extends Controller {
  static values = { authUrl: String, statusUrl: String }

  async open() {
    try {
      const status = await fetch(this.statusUrlValue, { headers: { Accept: "application/json" } })
        .then((r) => r.json())

      if (!status.connected) {
        await this._connect()
        return
      }

      // TODO (paso UI): abrir el picker de archivos de Drive (GET /drive/files).
      window.alert("Google Drive conectado. El selector de archivos llegará en el próximo paso.")
    } catch (e) {
      window.alert("No se pudo contactar con Google Drive. Inténtalo de nuevo.")
    }
  }

  async _connect() {
    const data = await fetch(this.authUrlValue, { headers: { Accept: "application/json" } })
      .then((r) => r.json())

    if (data.auth_url) {
      window.location.href = data.auth_url
    } else {
      window.alert("No se pudo iniciar la conexión con Google Drive.")
    }
  }
}
