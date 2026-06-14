# app/services/proposals/generator.rb
module Proposals
  class Generator
    def initialize(client, materials, ai_client: nil, embeddings_client: nil)
      @client = client
      @materials = materials
      @ai_client = ai_client || AI::OpenrouterClient.new
      @embeddings_client = embeddings_client || Embeddings::Client.new
    end

    def call
      return error_result('No materials provided') if @materials.empty?

      rag_chunks = retrieve_relevant_chunks
      used_rag = rag_chunks.present?

      system_prompt = build_system_prompt
      user_prompt = used_rag ? build_user_prompt_from_chunks(rag_chunks) : build_user_prompt

      response = @ai_client.generate_completion(
        prompt: user_prompt,
        system_prompt: system_prompt,
        max_tokens: 3000,
        temperature: 0.7
      )

      if response[:success]
        success_result(response[:content], response[:usage], used_rag: used_rag)
      else
        error_result(response[:error])
      end
    end

    private

    # Recupera los fragmentos más relevantes vía búsqueda semántica (RAG).
    # Devuelve [] ante cualquier fallo → el generador hace fallback a materiales
    # completos (paridad con el sistema original).
    def retrieve_relevant_chunks
      query = "#{@client.name} #{@client.industry} propuesta comercial".strip
      @embeddings_client.search(query, client_id: @client.id, top_k: 15)
    rescue Exception => e # rubocop:disable Lint/RescueException
      # Best-effort: cualquier fallo (red, Qdrant, OpenAI) → fallback a
      # materiales completos. Incluye errores fuera de StandardError.
      Rails.logger.warn "RAG search failed, falling back to raw materials: #{e.message}"
      []
    end

    def build_system_prompt
      <<~PROMPT
        Eres un experto en redacción de propuestas comerciales profesionales.
        
        Tu tarea es analizar los materiales proporcionados del cliente y generar 
        una propuesta comercial completa, estructurada y profesional en formato Markdown.
        
        La propuesta debe:
        1. Ser profesional y persuasiva
        2. Estar bien estructurada con secciones claras
        3. Basarse en los materiales proporcionados
        4. Incluir análisis de situación, solución propuesta, y próximos pasos
        5. Estar en español
        6. Usar formato Markdown para dar formato
        
        NO inventes información que no esté en los materiales.
        SÍ haz inferencias razonables basadas en el contexto.
      PROMPT
    end

    # Prompt con TODOS los materiales (fallback cuando no hay RAG).
    def build_user_prompt
      materials_text = @materials.map do |m|
        "**#{m.material_type.humanize}**:\n#{m.content}\n"
      end.join("\n---\n\n")

      build_prompt_with_context("Materiales del cliente:", materials_text)
    end

    # Prompt con los fragmentos relevantes recuperados por RAG.
    def build_user_prompt_from_chunks(chunks)
      context = chunks.map.with_index(1) do |chunk, i|
        "[Fragmento #{i}]\n#{chunk[:text]}\n"
      end.join("\n---\n\n")

      build_prompt_with_context("Fragmentos más relevantes del cliente (recuperados por búsqueda semántica):", context)
    end

    def build_prompt_with_context(context_header, context_body)
      <<~PROMPT
        Cliente: #{@client.name}
        Industria: #{@client.industry&.humanize || 'No especificada'}
        #{@client.description ? "Descripción: #{@client.description}" : ''}

        #{context_header}

        #{context_body}

        ---

        Genera una propuesta comercial profesional basada en esta información.
        Incluye las siguientes secciones:

        1. Resumen Ejecutivo
        2. Análisis de Situación Actual
        3. Solución Propuesta
        4. Beneficios Esperados
        5. Inversión (si hay información disponible)
        6. Próximos Pasos

        La propuesta debe ser específica para #{@client.name} y su industria.
      PROMPT
    end

    def success_result(content, usage, used_rag: false)
      {
        success: true,
        content: content,
        usage: usage,
        used_rag: used_rag
      }
    end

    def error_result(message)
      {
        success: false,
        error: message
      }
    end
  end
end
