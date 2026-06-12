import Icons from '../components/ui/Icons';
import { APP_NAME } from '../lib/constants';

function HelpScreen() {
  const sections = [
    {
      title: 'Flujo de trabajo',
      icon: <Icons.Sparkles />,
      items: [
        { q: 'Como genero una propuesta?', a: 'Ve a un cliente → sube materiales (audios, emails, textos, documentos) → elige una plantilla → pulsa "Generar propuesta". La IA condensara toda la informacion en una propuesta profesional.' },
        { q: 'Puedo editar la propuesta?', a: 'Si. Usa el editor WYSIWYG (boton lapiz) para cambios manuales, o el chat "Editar con IA" para pedir cambios en lenguaje natural. Ej: "Haz el resumen mas corto y enfatiza el ROI".' },
        { q: 'Como exporto a PDF?', a: 'En la vista de propuesta, pulsa el icono de documento (ultimo boton de la barra). Se descarga automaticamente como PDF A4.' },
      ]
    },
    {
      title: 'Plantillas de propuesta',
      icon: <Icons.FileText />,
      items: [
        { q: 'General', a: 'Estructura completa: resumen ejecutivo, contexto del cliente, necesidades, solucion, entregables, plan de trabajo, ROI, precio y proximos pasos. Ideal para la mayoria de propuestas.' },
        { q: 'Consultoria', a: 'Enfocada en servicios de asesoria: diagnostico del problema, estrategia propuesta, plan de accion detallado, inversion requerida y garantias de resultado.' },
        { q: 'Desarrollo Web', a: 'Para proyectos tecnologicos: objetivos del proyecto, arquitectura tecnica, fases de desarrollo, entregables por fase, plan de mantenimiento y presupuesto desglosado.' },
        { q: 'Marketing Digital', a: 'Para campanas y estrategia digital: analisis de mercado, estrategia propuesta, canales a utilizar, calendario de ejecucion, KPIs medibles y presupuesto.' },
        { q: 'Servicios', a: 'Para servicios recurrentes: descripcion detallada del servicio, metodologia de trabajo, equipo asignado, SLA (acuerdos de nivel de servicio) y precio.' },
      ]
    },
    {
      title: 'Analisis de sentimiento',
      icon: <Icons.Heart />,
      items: [
        { q: 'Que es el badge de sentimiento?', a: 'Un indicador de color (verde/amarillo/rojo) con score de -1.0 a +1.0 que muestra como de positiva o negativa es la comunicacion del cliente.' },
        { q: 'Como se calcula?', a: 'Cada vez que subes un material con texto, la IA analiza automaticamente el tono emocional. El badge muestra el promedio de todos los analisis del cliente.' },
        { q: 'Para que sirve?', a: 'Para priorizar: en el dashboard los clientes con sentimiento negativo aparecen primero. Si un cliente esta frustrado, lo ves inmediatamente. Si esta muy positivo, puede estar listo para cerrar.' },
      ]
    },
    {
      title: 'Materiales del cliente',
      icon: <Icons.Upload />,
      items: [
        { q: 'Que tipo de archivos puedo subir?', a: 'Audio (MP3, WAV, WebM), documentos (PDF, Word, TXT), hojas de calculo (CSV, Excel), y texto pegado manualmente (emails, notas de llamada, chats).' },
        { q: 'Que pasa con los audios?', a: 'Si tienes OPENAI_API_KEY configurada, Whisper transcribe el audio automaticamente. Veras la transcripcion debajo del reproductor. Ademas se analiza el sentimiento de la transcripcion.' },
        { q: 'Que es "Indexado"?', a: 'Significa que el texto del material se ha convertido en embeddings y guardado en Qdrant (base de datos vectorial). Esto permite busqueda semantica y mejora la calidad de las propuestas generadas.' },
      ]
    },
    {
      title: 'Pipeline comercial',
      icon: <Icons.Columns />,
      items: [
        { q: 'Como funciona el pipeline?', a: 'Es un tablero kanban con 6 etapas: Nuevo → Contactado → Propuesta enviada → Negociando → Cerrado (ganado) → Cerrado (perdido). Arrastra los clientes entre columnas para actualizar su estado.' },
        { q: 'Se guarda el cambio?', a: 'Si, automaticamente al soltar la tarjeta. El estado se guarda en la base de datos.' },
      ]
    },
    {
      title: 'Busqueda semantica',
      icon: <Icons.Search />,
      items: [
        { q: 'Que es?', a: 'Busca por significado, no por texto exacto. Si escribes "cuanto quiere gastar", encuentra materiales que hablan de "presupuesto", "precio" o "15.000 euros" aunque no contengan esas palabras exactas.' },
        { q: 'Necesita Qdrant?', a: 'Qdrant mejora la busqueda significativamente. Sin Qdrant, la busqueda cae a busqueda de texto simple (LIKE en PostgreSQL).' },
      ]
    },
    {
      title: 'Recomendaciones IA',
      icon: <Icons.TrendingUp />,
      items: [
        { q: 'Como funcionan?', a: 'La IA analiza los materiales del cliente, su historial de compras y sus preferencias para sugerir productos o servicios relevantes. Util para detectar oportunidades de venta cruzada.' },
        { q: 'Necesito materiales?', a: 'Si. Sin materiales, la IA no tiene contexto suficiente para recomendar. Cuantos mas materiales, mejores recomendaciones.' },
      ]
    },
  ];

  return (
    <div className="clients-screen">
      <div className="clients-header">
        <div>
          <h1>Ayuda</h1>
          <p>Guia completa de funcionalidades de {APP_NAME}</p>
        </div>
      </div>
      <div className="help-sections">
        {sections.map((section, si) => (
          <div key={si} className="help-section">
            <div className="help-section-header">
              <span className="help-section-icon">{section.icon}</span>
              <h2>{section.title}</h2>
            </div>
            <div className="help-items">
              {section.items.map((item, ii) => (
                <div key={ii} className="help-item">
                  <strong>{item.q}</strong>
                  <p>{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HelpScreen;
