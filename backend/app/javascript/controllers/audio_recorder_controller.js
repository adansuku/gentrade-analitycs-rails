import { Controller } from "@hotwired/stimulus"

// Graba audio en el navegador (MediaRecorder) y lo sube como material tipo audio
// reutilizando el endpoint de upload de materiales.
//
// Targets:
//   button   — botón/micrófono que alterna grabar/parar
//   status   — texto de estado ("Pulsa para grabar…", "Grabando…", "Subiendo…")
//   timer    — contador mm:ss durante la grabación
// Values:
//   uploadUrl — endpoint POST de subida de materiales
export default class extends Controller {
  static targets = ["button", "status", "timer"]
  static values = { uploadUrl: String }

  connect() {
    this.recording = false
    this.mediaRecorder = null
    this.chunks = []
    this.seconds = 0
    this.timerInterval = null
  }

  disconnect() {
    this._stopTracks()
    this._clearTimer()
  }

  toggle() {
    if (this.recording) {
      this.stop()
    } else {
      this.start()
    }
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this._setStatus("Tu navegador no soporta grabación de audio")
      return
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      this._setStatus("No se pudo acceder al micrófono. Revisa los permisos.")
      return
    }

    this.chunks = []
    this.mediaRecorder = new MediaRecorder(this.stream)

    this.mediaRecorder.addEventListener("dataavailable", (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    })
    this.mediaRecorder.addEventListener("stop", () => this._handleStop())

    this.mediaRecorder.start()
    this.recording = true
    this._startTimer()
    this._markRecording(true)
    this._setStatus("Grabando… pulsa de nuevo para parar")
  }

  stop() {
    if (this.mediaRecorder && this.recording) {
      this.mediaRecorder.stop()
      this.recording = false
      this._clearTimer()
      this._markRecording(false)
    }
  }

  _handleStop() {
    this._stopTracks()

    const blob = new Blob(this.chunks, { type: "audio/webm" })
    if (blob.size === 0) {
      this._setStatus("Grabación vacía, inténtalo de nuevo")
      return
    }

    this._upload(blob)
  }

  _upload(blob) {
    this._setStatus("Subiendo grabación…")

    const filename = `grabacion-${Date.now()}.webm`
    const formData = new FormData()
    formData.append("file", blob, filename)

    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content

    fetch(this.uploadUrlValue, {
      method: "POST",
      headers: {
        "X-CSRF-Token": csrfToken,
        "Accept": "text/vnd.turbo-stream.html"
      },
      body: formData
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error al subir la grabación")
        return res.text()
      })
      .then((html) => {
        Turbo.renderStreamMessage(html)
        this._setStatus("Pulsa para grabar una llamada o nota de voz")
      })
      .catch((err) => {
        this._setStatus(err.message)
      })
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  _markRecording(active) {
    if (!this.hasButtonTarget) return
    this.buttonTarget.classList.toggle("bg-red-600", active)
    this.buttonTarget.classList.toggle("animate-pulse", active)
    this.buttonTarget.classList.toggle("bg-[#1b5e3b]", !active)
  }

  _startTimer() {
    this.seconds = 0
    this._renderTimer()
    this.timerInterval = setInterval(() => {
      this.seconds += 1
      this._renderTimer()
    }, 1000)
  }

  _clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }

  _renderTimer() {
    if (!this.hasTimerTarget) return
    const m = String(Math.floor(this.seconds / 60)).padStart(2, "0")
    const s = String(this.seconds % 60).padStart(2, "0")
    this.timerTarget.textContent = `${m}:${s}`
  }

  _setStatus(text) {
    if (this.hasStatusTarget) this.statusTarget.textContent = text
  }

  _stopTracks() {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
  }
}
