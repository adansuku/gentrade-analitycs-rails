# app/services/proposals/editor.rb
module Proposals
  class Editor
    def initialize(proposal, message, ai_client: nil)
      @proposal = proposal
      @message = message
      @ai_client = ai_client || AI::OpenrouterClient.new
    end

    def call
      current_version = @proposal.current_version
      return error_result('No current version found') unless current_version

      # Build conversation history
      messages = build_conversation_messages(current_version)

      response = @ai_client.chat(
        messages: messages,
        max_tokens: 3000,
        temperature: 0.7
      )

      if response[:success]
        success_result(response[:content], response[:usage])
      else
        error_result(response[:error])
      end
    end

    private

    def build_conversation_messages(current_version)
      messages = [
        {
          role: 'system',
          content: build_system_prompt
        },
        {
          role: 'user',
          content: "Propuesta actual:\n\n#{current_version.content}"
        }
      ]

      # Add conversation history
      @proposal.messages.order(created_at: :asc).each do |msg|
        messages << {
          role: msg.role == 'user' ? 'user' : 'assistant',
          content: msg.content
        }
      end

      # Add current message
      messages << {
        role: 'user',
        content: @message
      }

      messages
    end

    def build_system_prompt
      <<~PROMPT
        Eres un asistente experto en edición de propuestas comerciales.
        
        Tu tarea es modificar una propuesta comercial existente según las 
        instrucciones del usuario. 
        
        IMPORTANTE:
        1. Devuelve SOLO la propuesta modificada completa en formato Markdown
        2. NO añadas comentarios como "Aquí está la propuesta modificada" 
        3. NO expliques los cambios que hiciste
        4. Mantén la estructura y formato profesional
        5. Aplica exactamente los cambios solicitados
        6. Mantén todo en español
        
        El usuario te dará instrucciones de edición. Aplícalas a la propuesta 
        y devuelve la versión completa modificada.
      PROMPT
    end

    def success_result(content, usage)
      {
        success: true,
        content: content,
        usage: usage
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
